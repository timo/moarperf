use OO::Monitors;

class Tip {
    has Int $.id;
    has Str $.tip;
    has Int $.agreed;
    has Int $.disagreed;
}

monitor Tipsy {
    has Int $!next-id = 1;
    has Tip %!tips-by-id{Int};
    has Supplier $!latest-tips = Supplier.new;

    method add-tip(Str $tip --> Nil) {
        my $id = $!next-id++;
        my $new-tip = Tip.new(:$id, :$tip);
        %!tips-by-id{$id} = $new-tip;
        start $!latest-tips.emit($new-tip);
    }

    method latest-tips(--> Supply) {
        my @latest-existing = %!tips-by-id.values.sort(-*.id).head(50);
        supply {
            whenever $!latest-tips {
                .emit;
            }
            .emit for @latest-existing;
        }
    }

    method agree(Int $tip-id --> Nil) { ... }
    method disagree(Int $tip-id --> Nil) { ... }

    method top-tips(--> Supply) { ... }
}
