// @flow

import $ from 'jquery';
// import type { HeapSnapshotState } from './reducer';

export const STATUS_UPDATE = 'HEAP_STATUS_UPDATE';
export const MODEL_OVERVIEW = 'MODEL_OVERVIEW';

type StatusUpdateAction = { type : "HEAP_STATUS_UPDATE", body: any };
type ModelOverviewAction = { type : "MODEL_OVERVIEW", suggested_filename: string };

export type HeapSnapshotAction =
                          StatusUpdateAction |
                          ModelOverviewAction;

// type DispatchType = (HeapSnapshotAction) => void;
// type GetStateType = () => HeapSnapshotState;

export function requestSnapshot(index : number) {
  return () => {
    $.ajax({
      url: '/request-snapshot',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ index }),
    });
  };
}
