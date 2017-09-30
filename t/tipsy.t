use Tipsy;
use Test;

my $tipsy = Tipsy.new;
lives-ok { $tipsy.add-tip('The lamb kebabs are good!') },
    'Can add a tip';
lives-ok { $tipsy.add-tip('Not so keen on the fish burrito!') },
    'Can add another tip';
given $tipsy.latest-tips.head(2).list -> @tips {
    is @tips[0].tip, 'Not so keen on the fish burrito!',
        'Correct first tip retrieved on initial tap of latest-tips';
    is @tips[1].tip, 'The lamb kebabs are good!',
        'Correct second tip retrieved on initial tap latest-tips';
}
react {
    whenever $tipsy.latest-tips.skip(2).head(1) {
        is .tip, 'Try the vanilla stout for sure',
            'Get new tips emitted live';
    }
    $tipsy.add-tip('Try the vanilla stout for sure');
}

done-testing;
