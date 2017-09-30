use Cro::HTTP::Router;
use Cro::HTTP::Router::WebSocket;

sub routes() is export {
    route {
        get -> {
            static 'static/index.html'
        }

        get -> 'js', *@path {
            static 'static/js', @path
        }

        my $chat = Supplier.new;
        get -> 'chat' {
            web-socket -> $incoming {
                supply {
                    whenever $incoming -> $message {
                        $chat.emit(await $message.body-text);
                    }
                    whenever $chat -> $text {
                        emit $text;
                    }
                }
            }
        }
    }
}
