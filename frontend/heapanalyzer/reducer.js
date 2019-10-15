//@flow

import * as ActionTypes from './actions';

export type LoadedSnapshotState = {
    state: string,
    progress: Array<number>,
}

export type OperationHandle = {
    uuid: string,
    description: string,
    progress: [number, number, number],
    cancellable: boolean,
}

export type HeapSnapshotState = {
    +loadedSnapshots: Array<any>,
    +filePath: string,
    +modelState: string,
    +fileIsLoaded: boolean,
    currentSnapshot: number,
    summaries: any,
    highscores: any,
    modelData: {types: {[number]: {name: string, repr: string} }, frames: {[number]: any}},

    runningOperations: { [string]: OperationHandle },
}

const initialState = {
  modelState: 'unknown',
  loadedSnapshots: [],
  filePath: '',
  runningOperations: {},
};
export default function heapAnalyzerReducer(
  state : HeapSnapshotState = initialState,
  action : ActionTypes.HeapSnapshotAction,
) : HeapSnapshotState {
  console.log('heap: got a thing to reduce');
  console.log(action.body);
  switch (action.type) {
    case ActionTypes.STATUS_UPDATE: {
      console.log("  it's a status update");
      if (action.body.hasOwnProperty('model_state')) {
        console.log('    updating the status with model state');
        console.log(action.body.loaded_snapshots);
        return {
          ...state,
          modelState: action.body.model_state,
          loadedSnapshots: action.body.loaded_snapshots,
          numSnapshots: action.body.num_snapshots,
          summaries: action.body.summaries,
          highscores: action.body.highscores,
        };
      } else if (action.body.hasOwnProperty('snapshot_index')) {
        const newSnapshots = state.loadedSnapshots.slice();
        console.log('    changing snapshot at', action.body.snapshot_index);
        console.log(action);
        newSnapshots[action.body.snapshot_index] = {
          ...action.body.snapshot_state,
          update_key: typeof action.body.update_key === "undefined" ? newSnapshots[action.body.snapshot_index].update_key : action.body.update_key
        };
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
    case ActionTypes.PROGRESS_UPDATE: {
      console.log("progress update");
      return {
        ...state,
        runningOperations: {
          ...state.runningOperations,
          [action.body.uuid]: {
            description: (typeof action.body.description === "undefined")
                ? state.runningOperations[action.body.uuid].description
                : action.body.description,
            cancellable: action.body.cancellable,
            progress: action.body.progress,
          }
        }
      }
    }
    case ActionTypes.SELECTION_SWITCH:
      console.log("switch selected snapshot");
      return {
        ...state,
        currentSnapshot: action.body,
      };
    case ActionTypes.DATA_UPDATE:
      console.log("get heap shared data");
      return {
        ...state,
        modelData: action.body.data,
      };
    default:
      (action: empty);
      console.log("didn't understand this action");
      return state;
  }
}
