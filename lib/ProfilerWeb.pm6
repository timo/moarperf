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
    $name || "<anon>"
}
sub concise-file($file is copy) {
    if $file.starts-with("SETTING::src/core/") {
        $file.=subst("SETTING::src/core/", "SETTING::");
        $file.=subst(".pm6", "");
    }
    $file
}


monitor ProfilerWeb {
    has $.dbh;

    has Supplier $!status-updates = Supplier::Preserving.new;

    has @.routine_overview;
    has %.all_routines;

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

        @!routine_overview = Empty;
        %!all_routines = Empty;

        start {
            note "getting all routines";
            my %all_routines = self.all-routines;
            note "sending all routines";
            $!status-updates.emit(%(
                data => "all_routines",
                body => %all_routines
            ));

            note "getting routine overview";
            my @overview = self.routine-overview;
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

    method all-routines() {
        %!all_routines ||= do {
            my $query = $!dbh.prepare(q:to/STMT/);
                select

                  r.id as id,
                  r.name as name,
                  r.file as file,
                  r.line as line

                from routines r
                order by id asc;
              STMT

            $query.execute();
            my @results = $query.allrows(:array-of-hash);
            $query.finish;

            my %results{Int};

            for @results {
                .<name> .= &concise-name;
                .<file> .= &concise-file;
                %results{.<id>.Int} = $_;
            }

            %results;
        }
    }

    method routine-overview() {
        @!routine_overview ||= do {
            note "building routine overview";
            my $query = $!dbh.prepare(q:to/STMT/);
                select
                    c.routine_id as id,

                    total(entries) as entries,
                    total(case when rec_depth = 0 then inclusive_time else 0 end) as inclusive_time,
                    total(exclusive_time) as exclusive_time,

                    total(spesh_entries) as spesh_entries,
                    total(jit_entries) as jit_entries,
                    total(inlined_entries) as inlined_entries,

                    count(c.id) as sitecount

                    from calls c

                    group by c.routine_id
                    order by inclusive_time desc;
                STMT

            $query.execute();
            my @results = $query.allrows(:array-of-hash);
            $query.finish;

            note "routine overview in " ~ (now - ENTER now);

            @results;
        }
    }

    method routine-paths($routine-id) {
        my $threads-query = $!dbh.prepare(q:to/STMT/);
            select
                thread_id,
                root_node

            from profile;
            STMT

        $threads-query.execute;
        my %thread-nodes = $threads-query.allrows(:array-of-hash).map({$^r<root_node> => $^r<thread_id>});
        $threads-query.finish;

        my $query = $!dbh.prepare(q:to/STMT/);
            select
                c.id             as call_id,
                c.parent_id      as parent_id

            from calls c

            where c.routine_id = ?;
            STMT
        $query.execute($routine-id);

        my %active-calls is SetHash;
        my %children-of;
        my %parent-of;
        my %routine-id;
        for $query.allrows(:array-of-hash) {
            %children-of{.<parent_id>}.push: .<call_id>;
            %active-calls{.<parent_id>} = 1 unless %parent-of{.<parent_id>}:exists;
            %parent-of{.<call_id>} = .<parent_id>;
            %routine-id{.<call_id>} = $routine-id;
        }

        $query.finish;

        my $parent-of-call-q = $!dbh.prepare(q:to/STMT/);
            select
                c.id         as call_id,
                c.parent_id  as parent_id,
                c.routine_id as routine_id

            from calls c

            where c.id = ?;
            STMT


        while %active-calls {
            my $call-id = %active-calls.grab;
            dd $call-id;
            $parent-of-call-q.execute($call-id);
            if $parent-of-call-q.row(:hash) -> $_ {
                next unless .<call_id>;
                %children-of{.<parent_id>}.push: .<call_id>;
                %active-calls{.<parent_id>} = 1 unless %parent-of{.<parent_id>}:exists;
                %parent-of{.<call_id>} = .<parent_id>;
                %routine-id{.<call_id>} = .<routine_id>;
            }
        }

        my @result-tree;
        for %thread-nodes {
            if %children-of{.key} > 0 {
                sub push-call(Int() $call-id) {
                    %(
                        routine  => %routine-id{$call-id},
                        call     => $call-id,
                        children =>
                            %children-of{$call-id}:exists
                                ?? [push-call($_) for %children-of{$call-id}.unique.grep(none($call-id))]
                                !! []
                    )
                }
                @result-tree.push(
                    %(
                        thread => .key.Int,
                        children => push-call(.key)
                    )
                );
            }
        }

        @result-tree;
    }

    method all-children-of-routine($routine-id) {
        my $query = $!dbh.prepare(q:to/STMT/);
            select
                c.routine_id     as id,
                c.parent_id      as parent_id,

                    total(c.entries) as entries,
                    total(case when c.rec_depth = 0 then c.inclusive_time else 0 end) as inclusive_time,
                    total(c.exclusive_time) as exclusive_time,

                    total(c.spesh_entries) as spesh_entries,
                    total(c.jit_entries) as jit_entries,
                    total(c.inlined_entries) as inlined_entries,

                    count(c.id) as sitecount

                from calls c
                    left outer join calls pc
                    on pc.id == c.parent_id

                where pc.routine_id = ?
                group by c.routine_id

                order by c.id asc
                ;
            STMT

        $query.execute($routine-id);
        my @results = $query.allrows(:array-of-hash);
        $query.finish;

        note "all-children-of-routine $routine-id in " ~ (now - ENTER now);

        @results;

    }

    method children-of-call($id) {
        my $query = $!dbh.prepare(q:to/STMT/);
            select
                c.id              as id,
                c.parent_id       as parent_id,
                c.entries         as entries,
                c.exclusive_time  as exclusive,
                c.inclusive_time  as inclusive,
                count(pc.id)      as childcount,
                c.inlined_entries as inlined_entries,
                c.spesh_entries   as spesh_entries,
                c.jit_entries     as jit_entries,

                c.routine_id      as routine_id

                from calls c
                    left outer join calls pc
                    on pc.id == c.parent_id

                where c.parent_id = ? or c.id = ?
                group by c.id

                order by calls.id asc
                ;
            STMT

        $query.execute($id, $id);
        my @results;
        for $query.allrows(:array-of-hash) -> $/ {
            # Put requested routine first, for convenience.
            if $<id> == $id {
                @results.unshift: $/
            }
            else {
                @results.push: $/;
            }
            $<depth> = +($<id> != $id);
        }

        $query.finish;

        @results;
    }

    sub val-from-query($query, $field) {
        $query.execute();
        LEAVE $query.finish;

        for $query.allrows(:array-of-hash) -> $/ {
            return $_ with $/{$field}
        }
    }

    method gc-summary() {
        my $fullcount = val-from-query($!dbh.prepare(q:to/STMT/), "full_count");
            select
                count(sequence_num) as full_count

            from gcs

            where full = 1
            group by sequence_num
            ;
            STMT

        my $allcount = val-from-query($!dbh.prepare(q:to/STMT/), "all_count");
            select
                count(sequence_num) as all_count

            from gcs

            group by sequence_num
            ;
            STMT

        my $stats-per-thread-q = $!dbh.prepare(q:to/STMT/);
            select
                gcs.thread_id,
                count(
                    case gcs.responsible when 1 then 1 end) as responsible_count,
                count(
                    case gcs.full when 1 then 1 end)        as major_count,
                total(gcs.time)          as time_sum,
                avg(
                    case gcs.full when 1 then time end
                )
                    as major_time_avg,
                avg(
                    case gcs.full when 0 then time end
                )
                    as minor_time_avg,
                case when profile.root_node is null then 0 else 1 end as is_code_thread

            from gcs
                inner join profile
                    on profile.thread_id = gcs.thread_id

            group by gcs.thread_id
            ;
            STMT

        $stats-per-thread-q.execute();
        my @stats_per_thread;
        for $stats-per-thread-q.allrows(:array-of-hash) -> $/ {
            @stats_per_thread[$<thread_id>] = $/;
        }
        $stats-per-thread-q.finish();

        my $stats-per-sequence-q = $!dbh.prepare(q:to/STMT/);
            select
                min(time) as min_time,
                max(time) as max_time,
                min(start_time) as earliest_start_time,
                max(start_time) as latest_start_time,
                min(start_time + time) as earliest_end_time,
                max(start_time + time) as latest_end_time,
                max(start_time + time) - min(start_time) as total_wallclock,
                group_concat(thread_id, ",") as participants,
                sequence_num,
                full

            from gcs

            group by sequence_num
            ;
            STMT

        $stats-per-sequence-q.execute();
        my @stats_per_sequence;
        for $stats-per-sequence-q.allrows(:array-of-hash) -> $/ {
            # $<participants> = from-json($<participants>);
            @stats_per_sequence[$<sequence_num>] = $/;
        }
        $stats-per-sequence-q.finish();

        return %(
                :$fullcount,
                :$allcount,
                :@stats_per_thread,
                :@stats_per_sequence,
                );
    }

    method gc-details(Int $sequence-num) {
        my $stats-of-sequence-q = $!dbh.prepare(q:to/STMT/);
            select
                time,
                start_time,
                thread_id,
                sequence_num,
                full,

                gen2_roots,
                promoted_bytes,
                retained_bytes,
                cleared_bytes,
                responsible

            from gcs

            where sequence_num = ?
            ;
            STMT

        $stats-of-sequence-q.execute($sequence-num);
        my @stats_of_sequence;
        for $stats-of-sequence-q.allrows(:array-of-hash) -> $/ {
            @stats_of_sequence[$<thread_id>] = $/;
        }
        $stats-of-sequence-q.finish();

        return %(
                :@stats_of_sequence
                );
    }
}
