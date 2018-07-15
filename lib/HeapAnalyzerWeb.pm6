use v6.d.PREVIEW;
use OO::Monitors;

use App::MoarVM::HeapAnalyzer::Model;

monitor HeapAnalyzerWeb {

    has App::MoarVM::HeapAnalyzer::Model $.model;

    has Supplier $!status-updates = Supplier::Preserving.new;

    method load-file($file is copy) {
        $file = $file.IO;
        die "$file does not exist" unless $file.e;
        die "$file does not a file" unless $file.f;
        die "$file does not readable" unless $file.r;
        note "trying to open a model file";
        my $resolve = Promise.new;
        start {
            note "started!";
            with $.model {
                die "Switching models NYI";
            }
            note "sending pre-load message";
            $!status-updates.emit({ model_state => "pre-load" });
            note "building the model now";
            $!model .= new(:$file);
            note "going to resolve";
            $resolve.keep;
            if $.model.num-snapshots == 1 {
                self.request-snapshot(0);
            }
            note "done, yay";
            $!status-updates.emit({ model_state => "post-load", |self.model-overview });
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

    method announce-date {
        $!status-updates.emit({ date => DateTime.now.Str })
    }

    method status-messages() {
        $!status-updates.Supply
    }

    method model-overview() {
        with $!model {
            {
                num_snapshots => $!model.num-snapshots,
                loaded_snapshots => ^$!model.num-snapshots .map({ $!model.snapshot-state($_).Str })
            }
        }
        else {
            %(
                model_state => "unprepared",
                |(suggested_filename => $_ with %*ENV<MOAR_HEAPSNAPSHOT>))
        }
    }

    method request-snapshot($index) {
        die "the model needs to load up first" without $!model;
        die "Snapshot ID $index out of range (0..$!model.num-snapshots())"
          unless $index ~~ 0..$!model.num-snapshots();
        die unless $!model.snapshot-state($index) ~~ SnapshotStatus::Unprepared;
        my Supplier $updates .= new;
        start react {
            whenever $updates.Supply -> $message {
                $!status-updates.emit: %(
                    |$message.pairs.map({ $^p.key.subst("-", "_") => $^p.value }),
                    snapshot_state => $!model.snapshot-state($index).Str);
                LAST {
                    await Promise.in(1);
                    $!status-updates.emit: %(
                        snapshot_index => $index,
                        snapshot_state => $!model.snapshot-state($index).Str,
                        is_done => True)
                }
            }
        };
        $!model.prepare-snapshot($index, :$updates);
    }
}
#
# class Tip {
#     has Int $.id is required;
#     has Str $.tip is required;
#     has Int $.agreed = 0;
#     has Int $.disagreed = 0;
#
#     method agree() {
#         self.clone(agreed => $!agreed + 1)
#     }
#
#     method disagree() {
#         self.clone(disagreed => $!disagreed + 1)
#     }
# }
#
# class X::Tipsy::NoSuchId is Exception {
#     has $.id;
#     method message() { "No tip with ID '$!id'" }
# }
#
# monitor Tipsy {
#     has Int $!next-id = 1;
#     has Tip %!tips-by-id{Int};
#     has Supplier $!latest-tips = Supplier.new;
#     has Supplier $!tip-change = Supplier.new;
#
#     method add-tip(Str $tip --> Nil) {
#         my $id = $!next-id++;
#         my $new-tip = Tip.new(:$id, :$tip);
#         %!tips-by-id{$id} = $new-tip;
#         start $!latest-tips.emit($new-tip);
#     }
#
#     method latest-tips(--> Supply) {
#         my @latest-existing = %!tips-by-id.values.sort(-*.id).head(50);
#         supply {
#             whenever $!latest-tips {
#                 .emit;
#             }
#             .emit for @latest-existing;
#         }
#     }
#
#     method agree(Int $tip-id --> Nil) {
#         self!with-tip: $tip-id, -> $tip-ref is rw {
#             $tip-ref .= agree;
#         }
#     }
#
#     method disagree(Int $tip-id --> Nil) {
#         self!with-tip: $tip-id, -> $tip-ref is rw {
#             $tip-ref .= disagree;
#         }
#     }
#
#     method !with-tip(Int $tip-id, &operation --> Nil) {
#         with %!tips-by-id{$tip-id} -> $tip-ref is rw {
#             operation($tip-ref);
#             start $!tip-change.emit($tip-ref<>);
#         }
#         else {
#             X::Tipsy::NoSuchId.new(id => $tip-id).throw;
#         }
#     }
#
#     method top-tips(--> Supply) {
#         my %initial-tips = %!tips-by-id;
#         supply {
#             my %current-tips = %initial-tips;
#             sub emit-latest-sorted() {
#                 emit [%current-tips.values.sort({ .disagreed - .agreed }).head(50)]
#             }
#             whenever Supply.merge($!latest-tips.Supply, $!tip-change.Supply) {
#                 %current-tips{.id} = $_;
#                 emit-latest-sorted;
#             }
#             emit-latest-sorted;
#         }
#     }
# }
