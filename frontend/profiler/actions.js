
// @flow

import $ from 'jquery';
import type { ProfilerState } from './reducer';
import {FILE_REQUESTED} from "../welcome/actions";

export const CHANGE_FILE_PATH = 'CHANGE_FILE_PATH';
export const EXPAND_ROUTINE   = 'EXPAND_ROUTINE';
export const ROUTINE_CHILDREN_GET = 'ROUTINE_CHILDREN_GET';

type FilePathChangedAction    = { type : "CHANGE_FILE_PATH", text: string };
type RoutineChildrenGetAction = { type: "ROUTINE_CHILDREN_GET", id: number, entries: Array<{}> };
type ExpandRoutineAction      = { type: "EXPAND_ROUTINE", id: number };

export type ProfilerAction = FilePathChangedAction |
                             RoutineChildrenGetAction |
                             ExpandRoutineAction
    ;
                          //StatusUpdateAction |
                          //ModelOverviewAction |
                          //FilePathChangedAction;

type DispatchType = (ProfilerAction) => void;
type GetStateType = () => ProfilerState;


export function expandRoutine(id : number) {
    return (dispatch : DispatchType, getState : GetStateType) => {
        dispatch({
            type: EXPAND_ROUTINE,
            id: id
        });
        console.log("will we get data about", id, "?", getState().profiler.expanded[id], typeof getState().profiler.allRoutineChildren[id]);
        if (getState().profiler.expanded[id] && typeof getState().profiler.allRoutineChildren[id] === "undefined") {
            $.ajax({
                url: '/routine-children/' + id,
                type: 'GET',
                contentType: 'application/json',
                success: (entries) => dispatch({type: ROUTINE_CHILDREN_GET, id, entries}),
            });
        }
    }
}

