use Cro::HTTP::Router;
use Cro::HTTP::Router::WebSocket;
use JSON::Fast;
use Tipsy;

sub routes(Tipsy $tipsy) is export {
    route {
        get -> {
            static 'static/index.html'
        }

        get -> 'js', *@path {
            static 'static/js', @path
        }

        post -> 'tips' {
            request-body -> (:$text) {
                $tipsy.add-tip($text);
                response.status = 204;
            }
        }

        get -> 'latest-tips' {
            web-socket -> $incoming {
                supply whenever $tipsy.latest-tips -> $tip {
                    emit to-json {
                        WS_ACTION => True,
                        action => {
                            type => 'LATEST_TIP',
                            id => $tip.id,
                            text => $tip.tip
                        }
                    } 
                }
            }
        }

        post -> 'tips', Int $id, 'agree' {
            $tipsy.agree($id);
            response.status = 204;
            CATCH {
                when X::Tipsy::NoSuchId {
                    not-found;
                }
            }
        }

        post -> 'tips', Int $id, 'disagree' {
            $tipsy.disagree($id);
            response.status = 204;
            CATCH {
                when X::Tipsy::NoSuchId {
                    not-found;
                }
            }
        }

        get -> 'top-tips' {
            web-socket -> $incoming {
                supply whenever $tipsy.top-tips -> @tips {
                    emit to-json {
                        WS_ACTION => True,
                        action => {
                            type => 'UPDATE_TOP_TIPS',
                            tips => [@tips.map: -> $tip {
                                {
                                    id => $tip.id,
                                    text => $tip.tip,
                                    agreed => $tip.agreed,
                                    disagreed => $tip.disagreed
                                }
                            }]
                        }
                    }
                }
            }
        }
    }
}
