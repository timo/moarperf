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

given $tipsy.latest-tips.head(3).list -> @tips {
    $tipsy.agree(@tips[0].id) for ^3;
    $tipsy.agree(@tips[1].id) for ^4;
    $tipsy.disagree(@tips[1].id) for ^10;
    $tipsy.agree(@tips[2].id) for ^2;
}
given $tipsy.top-tips.head(1).list[0] {
    is .[0].tip, 'Try the vanilla stout for sure',
        'Most agreeable tip first';
    is .[1].tip, 'The lamb kebabs are good!',
        'Next most agreeable tip second';
    is .[2].tip, 'Not so keen on the fish burrito!',
        'Least agreeable tip third';
}
throws-like { $tipsy.agree(99999) }, X::Tipsy::NoSuchId,
    'Correct exception on no such tip';

my $new-tip-id;
react {
    whenever $tipsy.top-tips.skip(1).head(1) {
        is .[0].tip, 'Try the vanilla stout for sure',
            'After adding a tip, correct order (1)';
        is .[1].tip, 'The lamb kebabs are good!',
            'After adding a tip, correct order (2)';
        is .[2].tip, 'The pau bahji is super spicy',
            'After adding a tip, correct order (3)';
        is .[3].tip, 'Not so keen on the fish burrito!',
            'After adding a tip, correct order (4)';
        $new-tip-id = .[2].id;
    }
    $tipsy.add-tip('The pau bahji is super spicy');
}
ok $new-tip-id, 'New tip ID seen in top sorted tips';

react {
    whenever $tipsy.top-tips.skip(5).head(1) {
        is .[0].tip, 'The pau bahji is super spicy',
            'After agrees, order updated';
    }
    $tipsy.agree($new-tip-id) for ^5;
}

done-testing;
