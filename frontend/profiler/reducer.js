import type { ActionTypes } from './actions';
import {EXPAND_ROUTINE, ROUTINE_CHILDREN_GET} from "./actions";

export type ProfilerState = {
    +modelState: string,
    +routines: Array<any>
}

const initialState = {
  modelState: 'pre-load',
  routines: [],
  routineOverview: [],
  expanded: {},
  allRoutineChildren: {},
  filePath: '',
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
    case ROUTINE_CHILDREN_GET: {
        const newstate = { ...state };
        newstate.allRoutineChildren[action.id] = action.entries;
        return newstate;
    }
    default: {
      return { ...state };
    }
  }
}
