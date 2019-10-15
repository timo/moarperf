use v6.d.PREVIEW;
use OO::Monitors;

use App::MoarVM::HeapAnalyzer::Model;

monitor HeapAnalyzerWeb {

    has App::MoarVM::HeapAnalyzer::Model $.model;

    has Supplier $!status-updates = Supplier::Preserving.new;

    has $!latest-model-state = "nothing";

    has %.operations-in-progress;

    has $!highscores;

    has Supplier $!progress-updates = Supplier::Preserving.new;

    method load-file($file is copy) {
        $file = $file.IO;
        die "$file does not exist" unless $file.e;
        die "$file does not a file" unless $file.f;
        die "$file does not readable" unless $file.r;
        note "trying to open a model file";
        my $resolve = Promise.new;
        start {
            note "started!";
            with $!model {
                die "Switching models NYI";
            }
            note "sending pre-load message";
            $!latest-model-state = "pre-load";
            $!status-updates.emit({ model_state => "pre-load" });
            note "building the model now";
            $!model .= new(:$file);
            note "going to resolve";
            $resolve.keep;
            if $!model.num-snapshots == 1 {
                self.request-snapshot(0);
            }
            note "done, yay";
            $!latest-model-state = "post-load";
            $!status-updates.emit({ model_state => "post-load", |self.model-overview });
            $!model.highscores.then({
                my @scores = .result;
                my %lookups;
                my $whole-result = %();
                for [<frames_by_size frames_by_count frames>, <types_by_size types_by_count types>] -> @bits {
                    my @all-indices;
                    my @per-position-entries;
                    for @scores -> $snap-score {
                        for $snap-score<topIDs>{@bits.head(2)} {
                            @all-indices.append($_.list);
                        }
                    }
                    @all-indices .= unique;
                    %lookups{@bits.tail} = @bits.tail eq "frames"
                            ?? (@all-indices Z=> $!model.resolve-frames(@all-indices)).hash
                            !! (@all-indices Z=> $!model.resolve-types(@all-indices)).hash;
                }

                for [<frames_by_size frames_by_count frames>, <types_by_size types_by_count types>] -> @bits {
                    for @scores -> $snap-score {
                        state $idx = 0;
                        for @bits.head(2) -> $bit {
                            my %right-lookup := %lookups{@bits.tail};
                            my &formatter = @bits.tail eq "frames" ?? { (.<name> || "<anon>") ~ " $_.<file>:$_<line>" } !! { .<name> };
                            for $snap-score<topIDs>{$bit}.list Z $snap-score<topscore>{$bit}.list {
                                $whole-result{$bit}[$idx]{formatter %right-lookup{$_[0]}} = $_[1];
                            }
                        }
                        $idx++;
                    }
                }

                $whole-result<lookups> = %lookups;

                $!highscores = $whole-result;

                $!status-updates.emit({ model_state => "post-load", |self.model-overview });
                LEAVE note "highscores calculated in $( now - ENTER now )s";
                CATCH { .say }
            });
            CATCH {
                note "error loading heap snapshot";
                $!status-updates.emit(
                    %(model_state => "error-load",
                      error_type => $_.^name,
                      error_message => $_.message));
                $resolve.break($_);
            }
        }
        note "waiting for resolve to happen";
        await $resolve;
    }

    method status-messages() {
        LEAVE {
            note "status messages opened; model state is $!latest-model-state";
            if $!latest-model-state eq "post-load" {
                Promise.in(0.1).then({ $!status-updates.emit({ model_state => "post-load", |self.model-overview }) });
            }
            if $!latest-model-state eq "nothing" {
                Promise.in(0.1).then({ $!status-updates.emit({ model_state => "nothing" }) });
            }
            $!status-updates.Supply.tap({ note "heap status message: $_" });
        }
        $!status-updates.Supply
    }

    method progress-messages() {
        LEAVE {
            for %.operations-in-progress {
                $!progress-updates.emit($_);
            }
        }
        $!progress-updates.Supply
    }

    method model-overview() {
        with $!model {
            {
                num_snapshots => $!model.num-snapshots,
                loaded_snapshots => ^$!model.num-snapshots .map({ $%( state => $!model.snapshot-state($_).Str ) }),
                |%(summaries => $_ with $!model.summaries),
                |%(highscores => $_ with $!highscores),
            }
        }
        else {
            %(
                model_state => "unprepared",
                |(suggested_filename => $_ with %*ENV<MOAR_HEAPSNAPSHOT>))
        }
    }

    method request-snapshot($index) {
        note "requested snapshot at ", DateTime.now;

        die "the model needs to load up first" without $!model;
        die "Snapshot ID $index out of range (0..$!model.num-snapshots())"
          unless $index ~~ 0..$!model.num-snapshots();

        die unless $!model.snapshot-state($index) ~~ SnapshotStatus::Unprepared;

        $!status-updates.emit: %(
            snapshot_index => $index,
            snapshot_state => { state => "Preparing" });

        my Supplier $updates .= new;

        my $update-key = (flat "a".."z", "A".."Z").pick(16).join("");

        $!progress-updates.emit: %(
                    progress => [0, 1, 0],
                    description => "reading snapshot $index",
                    uuid => $update-key,
                    :!cancellable,
                );

        start react {
            whenever $updates.Supply -> $message {
                if $message<progress>:exists {
                    $!progress-updates.emit: %(
                            uuid => $update-key,
                            progress => $message<progress>,
                            :!cancellable,
                        );
                }
            }
            whenever $!model.promise-snapshot($index, :$updates) {
                $!status-updates.emit: %(
                    snapshot_index => $index,
                    snapshot_state => { state => $!model.snapshot-state($index).Str },
                    is_done => True,
                )
            }
        }

        $update-key;
    }

    method collectable-data($snapshot, $index) {
        die unless $!model.snapshot-state($snapshot) ~~ SnapshotStatus::Ready;

        with $!model.promise-snapshot($snapshot).result -> $s {
            $s.col-details($index);
        }
    }

    method collectable-outrefs($snapshot, $index) {
        die unless $!model.snapshot-state($snapshot) ~~ SnapshotStatus::Ready;

        with $!model.promise-snapshot($snapshot).result -> $s {
            my @parts = $s.details($index);
            my @pieces;
            @pieces.push: @parts.shift;

            my %categories := @parts.rotor(2).classify({ .head, .tail.key });

            %(do for %categories {
                .key => %(do for .value.list -> $typepair {
                    $typepair.key => do for $typepair.value.list { .[1].value }
                })
            })
        }
    }

    method collectable-inrefs($snapshot, $index) {
        die unless $!model.snapshot-state($snapshot) ~~ SnapshotStatus::Ready;

        with $!model.promise-snapshot($snapshot).result -> $s {
            my $rev-refs = $s.reverse-refs($index).squish.cache;
            my %categories = $rev-refs.classify(*.value, as => *.key);

            use Data::Dump::Tree;

            ddt %categories;

            [%categories.sort({ .value.elems, .value.head }).map({ .key, .value })]
        }
    }

    my constant %kind-map = hash
        objects => CollectableKind::Object,
        stables => CollectableKind::STable,
        frames  => CollectableKind::Frame;

    method toplist($kind, $by, $snapshot, $count = 100, $start = 0) {
        die "snapshot not loaded" unless $!model.snapshot-state($snapshot) ~~ SnapshotStatus::Ready;
        die "invalid kind $kind" unless %kind-map{$kind}:exists;

        with $!model.promise-snapshot($snapshot).result -> $s {
            my @tops = $s."top-by-$by"($count + $start, %kind-map{$kind})
        }
    }

    method find(Int $snapshot, Str $kind, $condition, $target, Int $count, Int $start) {
        die "snapshot not loaded" unless $!model.snapshot-state($snapshot) ~~ SnapshotStatus::Ready;
        die "invalid kind $kind" unless %kind-map{$kind}:exists;

        dd $count, $start;

        with $!model.promise-snapshot($snapshot).result -> $s {
            my $tops = $s.find($count + $start, %kind-map{$kind}, $condition, $target);
            say $tops.values.elems;
            $tops.values.map({ %( id => .[0], descr => .[1], size => .[2] ) });
        }
    }

    method path(Int $snapshot, Int $collectable) {
        die unless $!model.snapshot-state($snapshot) ~~ SnapshotStatus::Ready;

        with $!model.promise-snapshot($snapshot).result -> $s {
            $s.path($collectable).duckmap(-> Pair $p { [$p.key, $p.value] });
        }
    }

    method request-shared-data {
        %(
            types => $!model.resolve-types(^$!model.num-types),
            frames => $!model.resolve-frames(^$!model.num-frames),
        )
    }
}
