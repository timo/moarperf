use OO::Monitors;

class Tip {
    has Int $.id is required;
    has Str $.tip is required;
    has Int $.agreed = 0;
    has Int $.disagreed = 0;

    method agree() {
        self.clone(agreed => $!agreed + 1)
    }

    method disagree() {
        self.clone(disagreed => $!disagreed + 1)
    }
}

class X::Tipsy::NoSuchId is Exception {
    has $.id;
    method message() { "No tip with ID '$!id'" }
}

monitor Tipsy {
    has Int $!next-id = 1;
    has Tip %!tips-by-id{Int};
    has Supplier $!latest-tips = Supplier.new;
    has Supplier $!tip-change = Supplier.new;

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

    method agree(Int $tip-id --> Nil) {
        self!with-tip: $tip-id, -> $tip-ref is rw {
            $tip-ref .= agree;
        }
    }

    method disagree(Int $tip-id --> Nil) {
        self!with-tip: $tip-id, -> $tip-ref is rw {
            $tip-ref .= disagree;
        }
    }

    method !with-tip(Int $tip-id, &operation --> Nil) {
        with %!tips-by-id{$tip-id} -> $tip-ref is rw {
            operation($tip-ref);
            start $!tip-change.emit($tip-ref<>);
        }
        else {
            X::Tipsy::NoSuchId.new(id => $tip-id).throw;
        }
    }

    method top-tips(--> Supply) {
        my %initial-tips = %!tips-by-id;
        supply {
            my %current-tips = %initial-tips;
            sub emit-latest-sorted() {
                emit [%current-tips.values.sort({ .disagreed - .agreed }).head(50)]
            }
            whenever Supply.merge($!latest-tips.Supply, $!tip-change.Supply) {
                %current-tips{.id} = $_;
                emit-latest-sorted;
            }
            emit-latest-sorted;
        }
    }
}
