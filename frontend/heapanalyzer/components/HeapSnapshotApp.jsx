//@flow
import React from "react";

import type {HeapSnapshotState, OperationHandle} from '../reducer';
import SnapshotList from './SnapshotList';

export function ProgressList(props: { operations: {[string]: OperationHandle}}) {
    var output = [];
    console.log("showing progress list!");
    console.log(props.operations);
    for (let key in props.operations) {
        let val = props.operations[key];
        console.log(key);
        output.push(
            <div>{val.description} ({val.progress[2]})</div>
        )
    }
    return output;
}

export default function HeapSnapshotApp(props: { heapanalyzer: HeapSnapshotState, onRequestSnapshot: any }) {
    return <>
        <SnapshotList
            modelState={props.heapanalyzer.modelState}
            loadedSnapshots={props.heapanalyzer.loadedSnapshots}
            operations={props.heapanalyzer.runningOperations}
            summaries={props.heapanalyzer.summaries}
            highscores={props.heapanalyzer.highscores}
            onRequestSnapshot={props.onRequestSnapshot}
        />
        <ProgressList operations={props.heapanalyzer.runningOperations} />
    </>
}