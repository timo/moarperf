use OO::Monitors;
use DBIish;

sub targetfile($filename, $extension, --> Str) {
    my $basename = $filename.IO.extension: '';
    my $newname = $basename.IO.extension($extension, :0parts).absolute;
    # Don't clobber existing files
    while $newname.IO.e {
        $newname = $basename.IO.extension(("a".."z").pick(5).join, :0parts).extension($extension, :0parts).absolute;
    }
    $newname;
}

sub create-database($databasefile where all(*.ends-with('sql'), *.IO.f, *.IO.e)) {
    note "creating an sqlite3 database from your sql file";
    my $newname = targetfile($databasefile, "sqlite3");
    note "sqlite3 file path is $newname";
    my $proc = run 'sqlite3', '-init', $databasefile, $newname, :in;
    # Don't want to send any commands to the sqlite database.
    $proc.in.close;
    $newname;
}

sub concise-name($name) {
    $name eq "" ?? "<anon>" !! $name
}
sub concise-file($file is copy) {
    if $file.starts-with("SETTING::src/core/") {
        $file.=subst("SETTING::src/core/", "CORE::");
        $file.=subst(".pm", "");
    }
    $file
}


monitor ProfilerWeb {
    has $.dbh;

    has Supplier $!status-updates = Supplier::Preserving.new;

    has @.routine_overview;

    method status-messages() {
        note "status messages subscribed";
        $!status-updates.Supply
    }

    method load-file(
        $databasefile is copy where all(
            *.ends-with('sqlite3' | 'sql'),
            *.IO.f,
            *.IO.e)) {

        if $databasefile.ends-with('sql') {
            $databasefile = create-database($databasefile);
        }

        $!dbh = DBIish.connect("SQLite", :database($databasefile));

        start {
            note "getting routine overview";
            my @overview = self.routine_overview;
            note "sending routine overview";
            $!status-updates.emit(%(
                data => "routine_overview",
                body => @overview
            ));
            note "done";
            CATCH {
                note "when trying to get routine overview:";
                note $!;
                $!status-updates.emit(%(
                    data => "error",
                    body => $_.Str
                ))
            }
        }
        CATCH {
            note "when trying to set up getting the routine overview:";
            note $!;
            $!status-updates.emit(%(
                data => "error",
                body => $_.Str
            ))
        }
    }

    method routine_overview() {
        @!routine_overview ||= do {
            note "building routine overview";
            my $query = $!dbh.prepare(q:to/STMT/);
                select
                    r.name as name,
                    r.file as file,
                    r.line as line,
                    r.id as id,

                    total(entries) as entries,
                    total(case when rec_depth = 0 then inclusive_time else 0 end) as inclusive_time,
                    total(exclusive_time) as exclusive_time,

                    total(spesh_entries) as spesh_entries,
                    total(jit_entries) as jit_entries,
                    total(inlined_entries) as inlined_entries,

                    count(c.id) as sitecount

                    from calls c, routines r
                    where c.routine_id = r.id

                    group by c.routine_id
                    order by inclusive_time desc;
                STMT

            $query.execute();
            my @results = $query.allrows(:array-of-hash);
            $query.finish;

            for @results {
                .<name> .= &concise-name;
                .<file> .= &concise-file;
            }

            note "routine overview in " ~ (now - ENTER now);

            @results;
        }
    }

    method !routine_and_children($id) {
        my $query = $!dbh.prepare(q:to/STMT/);
            select
                routines.name as name,
                routines.line as line,
                routines.file as file,

                calls.id as id,
                calls.parent_id      as parent_id,
                calls.entries        as entries,
                calls.exclusive_time as exclusive,
                calls.inclusive_time as inclusive

                from calls inner join routines on calls.routine_id = routines.id

                where calls.parent_id = ? or calls.id = ?

                order by calls.id asc
                ;
            STMT

        my $childcount = $!dbh.prepare(q:to/STMT/);
            select count(*) from calls where parent_id = ?
            STMT

        $query.execute($id, $id);
        my @results;
        for $query.allrows(:array-of-hash) -> $/ {
            @results.push: $/;
            $<name> = concise-name($<name>);
            $<file> = concise-file($<file>);
            $<depth> = +($<id> != $id);
            $childcount.execute($<id>);
            $<childcount> = $childcount.row.first;
        }

        $query.finish;
        $childcount.finish;

        @results;
    }
}
