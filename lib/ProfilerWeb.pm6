use OO::Monitors;
use DBIish;
use Digest::SHA1::Native;

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
    elsif $file.starts-with($*HOME.Str) {
        $file.=subst($*HOME.Str, "~")
    }
    if $file.contains(".precomp") {
        $file ~~ /
            (.*? "/.precomp/")
            (<[A..Z 0..9 a..z]> ** 6) <[A..Z 0..9 a..z]>+
            ("/" <[A..Z 0..9 a..z]>+)
            ("/" <[A..Z 0..9 a..z]> ** 6) <[A..Z 0..9 a..z]>+
            (.*)/;
        $file = $/.list.join("");
    }
    $file
}


monitor ProfilerWeb {
    has $.dbh;
    has $.filename;

    has Supplier $!status-updates = Supplier::Preserving.new;

    has @.routine_overview;
    has %.all_routines;

    method status-messages() {
        note "status messages subscribed";
        $!status-updates.Supply
    }

    method is-loaded() {
        return $!filename;
    }

    method load-file(
        $databasefile is copy where all(
            *.ends-with('sqlite3' | 'sql'),
            *.IO.f,
            *.IO.e)) {

        if $databasefile.ends-with('sql') {
            $databasefile = create-database($databasefile);
        }

        $!filename = $databasefile;

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

            my Channel $hashchan .= new;
            my $hasher = start {
                note "hasher started";
                sub map-to-range(uint8 $num, Range $range) {
                    ceiling ($num / 255) * $range.elems + $range.min;
                }
                for $hashchan.list {
                    my $bytes = sha1(.<file>);
                    if .<file>.starts-with("SETTING::") {
                        .<color> = "hsl($bytes[0], &map-to-range($bytes[1], 25..60)%, &map-to-range($bytes[2], 75..100)%)";
                    }
                    else {
                        .<color> = "hsl($bytes[0], &map-to-range($bytes[1], 50..75)%, &map-to-range($bytes[2], 65..100)%)";
                    }
                }
                note "hasher finished";
            }

            $query.execute();
            my @results = $query.allrows(:array-of-hash);
            $query.finish;

            my %results{Int};

            for @results {
                .<name> .= &concise-name;
                .<file> .= &concise-file;
                %results{.<id>.Int} = $_;
                $hashchan.send($_);
            }

            $hashchan.close;
            await $hasher;

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

                    total(osr) as osr,
                    total(deopt_one) as deopt_one,
                    total(deopt_all) as deopt_all,

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

    method !thread-ids-and-root-nodes() {
        my $threads-query = $!dbh.prepare(q:to/STMT/);
            select
                thread_id,
                root_node

            from profile;
            STMT

        $threads-query.execute;
        my @threads-result = $threads-query.allrows(:array-of-hash);
        my %thread-nodes = @threads-result.grep(*<root_node>.defined).map({$^r<root_node> => $r<thread_id>});
        $threads-query.finish;

        %thread-nodes;
    }

    method call-path(Int $call-id) {
        my %thread-nodes = self!thread-ids-and-root-nodes;

        my Junction $any-threadnode = any(%thread-nodes.keys);

        my $parent-of-call-q = $!dbh.prepare(q:to/STMT/);
            select
                c.id         as call_id,
                c.parent_id  as parent_id,
                c.routine_id as routine_id

            from calls c

            where c.id = ?;
            STMT

        my @nodes;
        loop {
            state $cursor = $call-id;
            $parent-of-call-q.execute($cursor);
            given $parent-of-call-q.row(:hash) {
                @nodes.unshift($_);
                $cursor = .<parent_id>;
                last if $cursor == $any-threadnode;
            }
        }

        @nodes;
    }

    method routine-paths(Int $routine-id) {
        my %thread-nodes = self!thread-ids-and-root-nodes;

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
            if %children-of{.key}:exists && %children-of{.key} {
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

    method recursive-children-of-call(Int $call-id) {
        sub with-children-of-multiple(@call, &code) {
            my $call-list = @call.join(",");
            my $query = $!dbh.prepare(qq:to/STMT/);
                select
                    id, parent_id

                from calls
                where
                    parent_id in($call-list)
                STMT

            $query.execute();
            code($_) for $query.allrows(:array-of-hash);
            $query.finish;
        }

        my @looking-for = $call-id;
        my %children;

        while @looking-for {
            my @old-looking-for = @looking-for;
            @looking-for = Empty;
            with-children-of-multiple @old-looking-for, {
                %children{.<parent_id>}.push: .<id>;
                @looking-for.push: .<id>;
            }
        }

        %children;
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

    method children-of-call(Int $id) {
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

                order by c.id asc
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

    sub alloc-props(*@props, Bool :$total-size) {
        my $result =
            @props.map({
                "json_extract(t.extra_info, '\$.{$_}') as {$_},"
            }).join("\n")
            ~ ($total-size
                    ?? "json_extract(t.extra_info, '\$.managed_size') * total(a.count) as total_size,"
                    !! "");
        dd $result;
        $result;
    }

    method all-allocs() {
        my @q-results;
        my $query;
        $query = $!dbh.prepare(q:c:to/STMT/);
            select
                t.id,
                t.name,
                {
                    alloc-props(<managed_size has_unmanaged_data repr scdesc>, :total-size)
                }

                total(a.jit) as jit,
                total(a.spesh) as spesh,
                total(a.count) as count,

                count(call_id) as sites,

                count(case when a.count > a.jit + a.spesh then call_id else NULL end) as speshed_sites

                from allocations a
                    inner join types t on a.type_id = t.id

                group by t.id
                order by json_extract(t.extra_info, '$.managed_size') * total(a.count) desc
                ;
            STMT
        $query.execute();

        @q-results = $query.allrows(:array-of-hash);

        $query.finish;

        @q-results
    }

    method call-allocations(Int $call) {
    # TODO fallback for pre-extra-info profiles
        my $query = $!dbh.prepare(q:c:to/STMT/);
            select
                a.type_id as type_id, t.name as name,

                {
                    alloc-props(<managed_size has_unmanaged_data repr scdesc>, :total-size)
                }

                a.jit as jit, a.spesh as spesh, a.count as count

                from allocations a
                    inner join types t on a.type_id = t.id

                where call_id = ?

                order by count asc
                ;
            STMT

        $query.execute($call);
        my @q-results = $query.allrows(:array-of-hash);
        $query.finish;

        @q-results
    }

    method routine-allocations(Int $routine) {
        # TODO fallback for pre-extra-info profiles
        my $query = $!dbh.prepare(q:c:to/STMT/);
            select
                a.type_id as type_id,
                t.name as name,

                {
                    alloc-props(<managed_size has_unmanaged_data repr scdesc>, :total-size)
                }


                total(a.jit) as jit, total(a.spesh) as spesh, total(a.count) as count,
                group_concat(c.id, ",") as participants

                from allocations a
                    inner join calls c on a.call_id = c.id
                    inner join types t on a.type_id = t.id

                where c.routine_id = ?

                group by a.type_id

                order by count asc
                ;
            STMT

        $query.execute($routine);
        my @q-results = $query.allrows(:array-of-hash);
        $query.finish;

        @q-results
    }

    method call-allocations-inclusive(Int $call) {
        my @callnodes = flat self.recursive-children-of-call($call).values>>.Slip, $call.Slip;

        my $calls-string = @callnodes.join(",");

        my $qstring = qq:to/STMT/;
            select
                a.type_id as type_id,
                t.name as name,

                {
                    alloc-props(<managed_size has_unmanaged_data repr scdesc>, :total-size)
                }
                total(a.jit) as jit,
                total(a.spesh) as spesh,
                total(a.count) as count,

                count(call_id) as sites

                from allocations a
                    inner join types t on a.type_id = t.id

                where call_id in($calls-string)

                group by a.type_id
                order by count desc
                ;
            STMT

        my $query = $!dbh.prepare($qstring);

        $query.execute();
        my @q-results = $query.allrows(:array-of-hash);
        $query.finish;

        CATCH {
            note $qstring;
        }

        @q-results
    }

    method allocations-per-type() {
        my $qstring = q:c:to/STMT/;
            select
                a.type_id as type_id,
                t.name as name,

                {
                    alloc-props(<managed_size has_unmanaged_data repr scdesc>, :total-size)
                }

                total(a.jit) as jit, total(a.spesh) as spesh, total(a.count) as count,
                count(call_id) as sites

                from allocations a
                    inner join types t on a.type_id = t.id

                group by a.type_id
                order by count desc
                ;
            STMT

        my $query = $!dbh.prepare($qstring);

        $query.execute();
        my @q-results = $query.allrows(:array-of-hash);
        $query.finish;

        @q-results;
    }

    method allocating-routines-per-type(Int $type-id) {
        my $query = $!dbh.prepare(q:to/STMT/);
            select
                routines.id as id,
                total(allocations.jit) as jit_allocs, total(allocations.spesh) as spesh_allocs, total(allocations.count) as allocs,
                total(calls.jit_entries) as jit_entries, total(calls.spesh_entries) as spesh_entries, total(calls.entries) as entries,

                count(calls.id) as sitecount

                from routines
                    inner join allocations on allocations.call_id == calls.id
                    inner join calls on calls.routine_id == routines.id
                    inner join types on types.id == allocations.type_id

                where allocations.type_id == ?

                group by routines.id, allocations.type_id
                order by allocs desc

            STMT

        $query.execute($type-id);

        LEAVE $query.finish;

        $query.allrows(:array-of-hash).eager;
    }

    method data-for-flamegraph(Int $thread-id) {
        my $thread-q = $!dbh.prepare(q:to/STMT/);
            select
                root_node,
                total_time
            from profile
            where thread_id = ?
        STMT

        $thread-q.execute($thread-id);
        my ($call-id, $total-time) = $thread-q.row;
        $thread-q.finish;

        sub children-with-width-of(Int $call-id, $parent-total, $global-width = 1e0) {
            my $query = $!dbh.prepare(q:to/STMT/);
                select
                    c.id as id,
                    c.inclusive_time as inclusive,
                    c.routine_id     as routine_id

                from calls c

                where c.parent_id = ?

                order by calls.id asc
                ;
            STMT

            [
                $call-id, $parent-total
            ]
        }


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
                total(retained_bytes) as retained_bytes,
                total(cleared_bytes) as cleared_bytes,
                total(promoted_bytes) as promoted_bytes,
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
