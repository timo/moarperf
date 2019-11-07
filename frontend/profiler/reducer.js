import type { ActionTypes } from './actions';
import {EXPAND_ROUTINE, ROUTINE_CHILDREN_GET, EXPAND_GC_SEQ, GC_SEQ_DETAILS_GET, APP_SET_FULLSCREEN} from "./actions";

export type ProfilerState = {
    +modelState: string,
    +routines: Array<any>
}

const initialState = {
  modelState: 'pre-load',
  routines: [],
  routineOverview: [],
  gc: {
      overview: {},
      expanded: {}
  },
  expanded: {},
  allRoutineChildren: {},
  filePath: '',
  fullscreen: false,
};
export default function profilerReducer(
  state : ProfilerState = initialState,
  action : ActionTypes.ProfilerAction,
) : ProfilerState {
  console.log('got a profiler datum to reduce');
  console.log(action);
  switch (action.type) {
    case 'PROFILE_STATUS_UPDATE': {
      console.log('status update, yay');
      const newstate = { ...state };
      if (action.body.data === 'routine_overview') {
        newstate.routineOverview = action.body.body;
        console.log('routine overview stored');
      }
      if (action.body.data === 'all_routines') {
        newstate.routines = action.body.body;
        console.log('all routines stored');
      }
      if (action.body.data === 'gc_overview') {
        newstate.gc.overview = action.body.body;
        console.log('GC overview stored');
      }

      return newstate;
    }
    case EXPAND_ROUTINE: {
      const newstate = { ...state };
      newstate.expanded = { ...newstate.expanded };
      if (newstate.expanded[action.id]) {
        newstate.expanded[action.id] = undefined;
      }
      else {
        newstate.expanded[action.id] = 1;
      }
      console.log("switched expanded of " + action.id + " ")
      return newstate;
    }
      case EXPAND_GC_SEQ: {
          const newstate = { ...state };
          newstate.gc = { ...newstate.gc };
          newstate.gc.expanded = { ...newstate.gc.expanded };
          if (newstate.gc.expanded[action.seq_num]) {
              newstate.gc.expanded[action.seq_num] = undefined;
          }
          else {
              newstate.gc.expanded[action.seq_num] = 1;
          }
          console.log("switched expanded of gc " + action.seq_num + " ")
          return newstate;
      }
    case ROUTINE_CHILDREN_GET: {
        const newstate = { ...state };
        newstate.allRoutineChildren[action.id] = action.entries;
        return newstate;
    }
    case GC_SEQ_DETAILS_GET: {
        const newstate = { ...state };
        newstate.gc = { ...state.gc };
        newstate.gc.seq_details = { ...state.gc.seq_details };
        newstate.gc.seq_details[action.seq_num] = action.data.stats_of_sequence;
        return newstate;
    }
    default: {
      return { ...state };
    }
  }
}
