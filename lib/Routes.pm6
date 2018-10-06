use Cro::HTTP::Router;
use Cro::HTTP::Router::WebSocket;
use JSON::Fast;
use HeapAnalyzerWeb;
use ProfilerWeb;
use CodeRunner;

sub json-content($route, &code) {
    say "json content";
    my $start = now;
    my $result = code();
    note "$route in { now - $start }";
    $start = now;
    my $json-result = to-json($result);
    note "$route json in { now - $start }: $json-result.chars() characters";
    content "application/json", $json-result;
}

sub routes(HeapAnalyzerWeb $model, ProfilerWeb $profiler, $filename?) is export {
    sub load-file(Str $path) {
        if $path.ends-with("sql" | "sqlite3") {
            note "opening an sql thing";
            $profiler.load-file($path);
            note "done";
            return { filetype => "profile" };
        } else {
            note "opening a heap thing";
            $model.load-file($path);
            note "done";
            return { filetype => "heapsnapshot" };
        }
    }

    load-file($_) with $filename;

    route {
        get -> {
            static 'static/index.html'
        }

        get -> 'js', *@path {
            static 'static/js', @path;
        }

        get -> 'js', 'bootstrap.bundle.js' { static 'node_modules/bootstrap/dist/js/bootstrap.bundle.js' }
        get -> 'js', 'bootstrap.bundle.js.map' { static 'node_modules/bootstrap/dist/js/bootstrap.bundle.js.map' }

        get -> 'css', *@path {
            static 'static/css', @path;
        }

        get -> 'css', 'bootstrap.css' { static 'node_modules/bootstrap/dist/css/bootstrap.css' }
        get -> 'css', 'bootstrap-grid.css' { static 'node_modules/bootstrap/dist/css/bootstrap-grid.css' }
        get -> 'css', 'bootstrap-reboot.css' { static 'node_modules/bootstrap/dist/css/bootstrap-reboot.css' }

        get -> 'imagery', *@path {
            static 'static/imagery', @path;
        }

        get -> 'whats-loaded' {
            if $profiler.is-loaded -> $filename {
                content 'application/json', { filetype => "profile", filename => $filename }
            }
            # XXX something for the heap analyzer
            else {
                content 'application/json', %( )
            }
        }

        post -> 'load-file' {
            request-body -> (Str :$path?) {
                say $path.perl;
                content 'application/json', load-file($path);
            }
        }

        post -> 'browse' {
            request-body -> (Str :$type = "script") {
                content "application/json", {filenames => CodeRunner.get-interesting-local-files(:$type)};
            }
        }

        get -> 'recursive-call-children', Int $call-id {
            json-content "recursive-call-children", { $profiler.recursive-children-of-call($call-id) }
        }

        get -> 'routine-children', Int $routine-id {
            json-content "routine-children", { $profiler.all-children-of-routine($routine-id) };
        }

        get -> 'routine-overview' {
            json-content "routine-overview", { $profiler.routine-overview }
        }

        get -> 'all-routines' {
            json-content "all-routines", { $profiler.all-routines }
        }

        get -> 'routine-paths', Int $routine-id {
            json-content "routine-paths", { $profiler.routine-paths($routine-id) };
        }

        get -> 'call-path', Int $call-id {
            json-content "call-path", { $profiler.call-path($call-id) };
        }

        get -> 'call-children', Int $call-id {
            json-content "call-children", { $profiler.children-of-call($call-id) };
        }

        get -> 'gc-overview' {
            json-content "gc-overview", { $profiler.gc-summary };
        }

        get -> 'gc-details', Int $sequence-num {
            json-content "gc-details", { $profiler.gc-details($sequence-num) };
        }

        get -> 'all-allocations' {
            json-content "all-allocs", { $profiler.all-allocs };
        }

        get -> 'call-allocations', Int $call {
            json-content "call-allocations", { $profiler.call-allocations($call) }
        }

        get -> 'routine-allocations', Int $routine {
            json-content "routine-allocations", { $profiler.routine-allocations($routine) }
        }

        get -> 'inclusive-call-allocations', Int $call {
            json-content "inclusive-call-allocations", { $profiler.call-allocations-inclusive($call) }
        }

        get -> 'allocations-per-type' {
            json-content "allocations-per-type", { $profiler.allocations-per-type }
        }

        get -> 'allocating-routines-per-type', Int $type {
            json-content "allocating-routines-per-type", { $profiler.allocating-routines-per-type($type) }
        }

        get -> 'model-overview' {
            content "application/json", to-json($model.model-overview)
        }

        post -> 'request-snapshot' {
            request-body -> (Int :$index!) {
                $model.request-snapshot($index);
                response.status = 204;
            }
        }

        get -> 'heap-status-messages' {
            web-socket -> $incoming {
                supply whenever $model.status-messages -> $message {
                    emit to-json {
                        WS_ACTION => True,
                        action => {
                              type => "HEAP_STATUS_UPDATE",
                              body => $message
                        }
                    }
                }
            }
        }

        get -> 'profile-status-messages' {
            note "subscribing to profiler status messages";
            web-socket -> $incoming {
                supply {
                    whenever $profiler.status-messages -> $message {
                        note "got a status message";
                        emit to-json {
                            WS_ACTION => True,
                            action => {
                                type => "PROFILE_STATUS_UPDATE",
                                body => $message
                            }
                        }
                        note "  success!";
                    }
                    QUIT {
                        note "status message subscription ended";
                        note $_;
                    }
                    LAST {
                        note "oh no, why did the status messages get LAST?";
                    }
                }
            }
        }

        # get -> 'latest-tips' {
        #     web-socket -> $incoming {
        #         supply whenever $tipsy.latest-tips -> $tip {
        #             emit to-json {
        #                 WS_ACTION => True,
        #                 action => {
        #                     type => 'LATEST_TIP',
        #                     id => $tip.id,
        #                     text => $tip.tip
        #                 }
        #             }
        #         }
        #     }
        # }
        #
        # post -> 'tips', Int $id, 'agree' {
        #     $tipsy.agree($id);
        #     response.status = 204;
        #     CATCH {
        #         when X::Tipsy::NoSuchId {
        #             not-found;
        #         }
        #     }
        # }
        #
        # post -> 'tips', Int $id, 'disagree' {
        #     $tipsy.disagree($id);
        #     response.status = 204;
        #     CATCH {
        #         when X::Tipsy::NoSuchId {
        #             not-found;
        #         }
        #     }
        # }
        #
        # get -> 'top-tips' {
        #     web-socket -> $incoming {
        #         supply whenever $tipsy.top-tips -> @tips {
        #             emit to-json {
        #                 WS_ACTION => True,
        #                 action => {
        #                     type => 'UPDATE_TOP_TIPS',
        #                     tips => [@tips.map: -> $tip {
        #                         {
        #                             id => $tip.id,
        #                             text => $tip.tip,
        #                             agreed => $tip.agreed,
        #                             disagreed => $tip.disagreed
        #                         }
        #                     }]
        #                 }
        #             }
        #         }
        #     }
        # }
    }
}
