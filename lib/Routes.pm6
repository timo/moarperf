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
    }
}
