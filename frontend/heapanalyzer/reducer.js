import * as ActionTypes from './actions';

export type HeapSnapshotState = {
    +loadedSnapshots: Array<any>,
    +filePath: string,
    +modelState: string
}

const initialState = {
  modelState: 'pre-load',
  loadedSnapshots: [],
  filePath: '',
};
export default function heaspAnalyzerReducer(
  state : HeapSnapshotState = initialState,
  action : ActionTypes.HeapSnapshotAction,
) : HeapSnapshotState {
  console.log('got a thing to reduce');
  console.log(action);
  switch (action.type) {
    case ActionTypes.STATUS_UPDATE: {
      console.log("it's a status update");
      if (action.body.hasOwnProperty('model_state')) {
        console.log('updating the status with model state');
        console.log(action.body.loaded_snapshots);
        return {
          ...state,
          modelState: action.body.model_state,
          loadedSnapshots: action.body.loaded_snapshots,
          numSnapshots: action.body.num_snapshots,
        };
      } else if (action.body.hasOwnProperty('snapshot_index')) {
        const newSnapshots = state.loadedSnapshots.slice();
        console.log('changing snapshot at', action.body.snapshot_index);
        newSnapshots[action.body.snapshot_index] = action.body.snapshot_state;
        console.log(action);
        console.log(newSnapshots);
        return {
          ...state,
          loadedSnapshots: newSnapshots,
        };
      }

      console.log("didn't understand this");
      console.log(action);
      return state;
    }
    case ActionTypes.MODEL_OVERVIEW: {
      console.log('model overview!');
      console.log(action);
      return {
        ...state,
        filePath: action.suggested_filename,
      };
    }
    default:
      (action: empty);
      console.log("didn't understand this action");
      return state;
  }
}
