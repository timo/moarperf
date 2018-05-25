import RoutineList from './RoutineList';

export default {
  component: RoutineList,
  props: {
    globalStats: {
      totalExclusiveTime: 1010,
    },
    routines: [{
      name: 'reify',
      filename: 'blah.p6',
      line: 1234,
      entries: 99999,
      exclusiveTime: 1000,
    },
    {
      name: 'iterator',
      filename: 'SETTING::Bloop.p6',
      line: 99,
      entries: 2,
      exclusiveTime: 10,
    }],
  },
};
