
// @flow

import $ from 'jquery';
import type { ProfilerState } from './reducer';
import {FILE_REQUESTED} from "../welcome/actions";

export const CHANGE_FILE_PATH = 'CHANGE_FILE_PATH';
export const EXPAND_ROUTINE   = 'EXPAND_ROUTINE';
export const ROUTINE_CHILDREN_GET = 'ROUTINE_CHILDREN_GET';
export const GC_OVERVIEW_GET = 'GC_OVERVIEW_GET';
export const EXPAND_GC_SEQ= 'EXPAND_GC_SEQ';
export const GC_SEQ_DETAILS_GET = 'GC_SEQ_DETAILS_GET';

type FilePathChangedAction    = { type: "CHANGE_FILE_PATH", text: string };
type RoutineChildrenGetAction = { type: "ROUTINE_CHILDREN_GET", id: number, entries: Array<{}> };
type ExpandRoutineAction      = { type: "EXPAND_ROUTINE", id: number };
type GcOverviewGetAction      = { type: "GC_OVERVIEW_GET", data: any};
type GcSeqExpandAction        = { type: "EXPAND_GC_SEQ", seq_num: number };
type GcSeqDetailsGetAction    = { type: "GC_SEQ_DETAILS_GET", seq_num: number, data: any };

export type ProfilerAction = FilePathChangedAction |
                             RoutineChildrenGetAction |
                             ExpandRoutineAction |
                             GcOverviewGetAction |
                             GcSeqExpandAction |
                             GcSeqDetailsGetAction
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

export function getGCOverview() {
    return (dispatch : DispatchType, getState : GetStateType) => {
        if (typeof getState().profiler.gcOverview === "undefined") {
            $.ajax({
                url: '/gc-overview',
                type: 'GET',
                contentType: 'application/json',
                success: (data) => dispatch({type: 'PROFILE_STATUS_UPDATE', body: {data: "gc_overview", body: data}}),
            });
        }
    }
}

export function getGCDetails(seq_num : number) {
    return (dispatch : DispatchType, getState : GetStateType) => {
        dispatch({
            type: EXPAND_GC_SEQ,
            seq_num: seq_num
        });
        if (typeof getState().profiler.gcDetails === "undefined") {
            $.ajax({
                url: '/gc-details/' + seq_num,
                type: 'GET',
                contentType: 'application/json',
                success: (data) => dispatch({type: 'GC_SEQ_DETAILS_GET', seq_num, data}),
            });
        }
    }
}

