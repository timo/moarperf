
// @flow

import $ from 'jquery';
import type { ProfilerState } from './reducer';

export const CHANGE_FILE_PATH = 'CHANGE_FILE_PATH';

type FilePathChangedAction = { type : "CHANGE_FILE_PATH", text: string };

//export type ProfilerAction = FileRequestedAction |
                          //StatusUpdateAction |
                          //ModelOverviewAction |
                          //FilePathChangedAction;

type DispatchType = (ProfilerAction) => void;
type GetStateType = () => ProfilerState;

