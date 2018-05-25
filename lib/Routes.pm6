use Cro::HTTP::Router;
use Cro::HTTP::Router::WebSocket;
use JSON::Fast;
use HeapAnalyzerWeb;
use ProfilerWeb;
use CodeRunner;

sub routes(HeapAnalyzerWeb $model, ProfilerWeb $profiler) is export {
    route {
        get -> {
            static 'static/index.html'
        }

        get -> 'js', *@path {
            static 'static/js', @path;
        }

        get -> 'imagery', *@path {
            static 'static/imagery', @path;
        }

        post -> 'load-file' {
            request-body -> (Str :$path?) {
                say $path.perl;
                if $path.ends-with("sql" | "sqlite3") {
                    note "opening an sql thing";
                    $profiler.load-file($path);
                    note "done";
                    content "application/json", {filetype => "profile"};
                } else {
                    note "opening a heap thing";
                    $model.load-file($path);
                    note "done";
                    content "application/json", {filetype => "memory"};
                }
            }
        }

        post -> 'browse' {
            request-body -> (Str :$type = "script") {
                content "application/json", {filenames => CodeRunner.get-interesting-local-files(:$type)};
            }
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
                            heapsnapshot => {
                                type => "STATUS_UPDATE",
                                body => $message
                            }
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
                        note to-json($message, :pretty).indent(4);
                        emit to-json {
                            WS_ACTION => True,
                            action => {
                                profiler => {
                                    type => "STATUS_UPDATE",
                                    body => $message
                                }
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
