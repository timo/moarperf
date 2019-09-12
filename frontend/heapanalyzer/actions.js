// @flow

import $ from 'jquery';
// import type { HeapSnapshotState } from './reducer';

export const STATUS_UPDATE = 'HEAP_STATUS_UPDATE';
export const MODEL_OVERVIEW = 'MODEL_OVERVIEW';
export const PROGRESS_UPDATE = 'HEAP_PROGRESS_UPDATE';
export const DATA_UPDATE = 'MODEL_DATA_UPDATE';

type StatusUpdateAction = { type : "HEAP_STATUS_UPDATE", body: any };
type ModelOverviewAction = { type : "MODEL_OVERVIEW", suggested_filename: string };
type ProgressUpdateAction = { type: "HEAP_PROGRESS_UPDATE",
          uuid: string,
          description: string,
          cancellable: boolean,
          progress: [number, number, number]
}
type ModelDataAction = { type: "MODEL_DATA_UPDATE", body: any }

export type HeapSnapshotAction =
                          StatusUpdateAction |
                          ModelOverviewAction |
                          ProgressUpdateAction |
                          ModelDataAction;

// type DispatchType = (HeapSnapshotAction) => void;
// type GetStateType = () => HeapSnapshotState;

export function requestSnapshot(index : number) {
  return (dispatch) => {
    $.ajax({
      url: '/request-snapshot',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ index }),
      success: ({ update_key }) => dispatch(
          {
            type: "HEAP_STATUS_UPDATE",
            body: {
              snapshot_index: index,
              snapshot_state: "Preparing",
              update_key
            }
          })
    });
  };
}

export function requestModelData() {
    return (dispatch) => {
        $.ajax({
            url: '/request-heap-shared-data',
            type: 'POST',
            contentType: 'application/json',
            success: ({ data }) => dispatch(
                {
                    type: "MODEL_DATA_ACTION",
                    body: {
                        data
                    }
                })
        });
    };
}