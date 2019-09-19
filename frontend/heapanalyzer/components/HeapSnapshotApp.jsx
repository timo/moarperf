//@flow
import React, { useState, useEffect } from "react";

import $ from 'jquery';

import { Table, Container, Input } from 'reactstrap';

import type {HeapSnapshotState, OperationHandle} from '../reducer';
import SnapshotList from './SnapshotList';
import { SummaryGraphs, HighscoreGraphs } from './Graphs';

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

export function CollectableDisplay(props: any) {
    let [collectableData, setCollectableData] = useState({ index: props.initialIndex });
    let [navigateInput, setNavigateInputText] = useState(props.initialIndex);
    let [outgoingRefs, setOutgoingRefs] = useState(undefined);
    let [incomingRefs, setIncomingRefs] = useState(undefined);

    function requestOutgoingRefs() {
        if (typeof collectableData.outrefs === "undefined") {
            $.ajax({
                url: 'collectable-outrefs/' + props.snapshotIndex + '/' + collectableData.index,
                success: (data) => setCollectableData({...collectableData, outrefs: data})
            });
        }
    }

    useEffect(() => {
        if (collectableData.hasOwnProperty("description")) {
            if (collectableData.wantToRequest) {
                if (collectableData["outgoing-refs"] < 128) {
                    requestOutgoingRefs();
                }
                setCollectableData({ ...collectableData, wantToRequest: 0});
            }
            return;
        }
        $.ajax({
            url: '/collectable-data/' + props.snapshotIndex + '/' + collectableData.index,
            success: (data) => {
                setCollectableData({ ...data, wantToRequest: 1 });
            }
        })
    }, [collectableData]);


    function navigateTo(id) {
        setOutgoingRefs(undefined);
        setIncomingRefs(undefined);
        setCollectableData({index: id});
        setNavigateInputText(id);
    }

    return (
        <>
            <div style={props.style}>
                Collectable
                <form onSubmit={(ev) => { ev.preventDefault(); navigateTo(navigateInput) }}>
                <Input
                    value={navigateInput}
                    onChange={(ev) => setNavigateInputText(ev.target.value)}
                    onBlur={(ev) => navigateTo(navigateInput) }/>
                </form>
                { collectableData.hasOwnProperty("description") && collectableData.description }
                {
                    typeof collectableData.description !== "undefined" && <>
                        <Table><tbody>
                            <tr><td>Kind</td><td>{ collectableData.kind }</td></tr>
                            <tr><td>Size</td><td>{ collectableData.size } + { collectableData.unmanagedSize }</td></tr>
                            <tr><td rowSpan={2}>References</td><td>{ collectableData['outgoing-refs'] } outgoing</td></tr>
                            <tr><td>{ collectableData['incoming-refs'] } incoming</td></tr>
                        </tbody></Table>
                        <div>
                            <div style={{textAlign: "center"}}>Outgoing References</div>
                            {
                                collectableData.hasOwnProperty("outrefs") &&
                                    Object.entries(collectableData.outrefs).map(([key, value], index) => (
                                        <div style={{paddingLeft: "0.2em"}}>
                                            { key }
                                            {
                                                Object.entries(value).map(([key, value], index) => {
                                                    const ulStyle = {
                                                        display: "flex",
                                                        flexWrap: "wrap",
                                                        justifyContent: "space-evenly"
                                                    };
                                                    const liStyle = {
                                                        border: "1px solid black",
                                                        textAlign: "center",
                                                        background: "#eef",
                                                    }
                                                    return (
                                                    <Container>
                                                        {key}
                                                        <div style={ulStyle}>
                                                            {value.map(entry => (<button key={entry} style={liStyle} onClick={() => navigateTo(entry)}>{entry}</button>))}
                                                        </div>
                                                    </Container>)
                                                })
                                            }
                                        </div>
                                    ))
                                ||
                                    <tr><td><button onClick={() => requestOutgoingRefs()}>Load</button></td></tr>

                            }
                        </div>
                    </>
                }
            </div>
        </>
    )
}

export default function HeapSnapshotApp(props: { heapanalyzer: HeapSnapshotState, onRequestSnapshot: any, onSwitchSnapshot: any }) {
    let [numberOfTopSpots, setNumberOfTopSpots] = useState(10);
    let [showGraphs, setShowGraphs] = useState(true);
    let numberOfSpotChange = e => setNumberOfTopSpots(e.target.value);

    let toggleGraphs = function() { setShowGraphs(!showGraphs)};

    return <>
        <SnapshotList
            modelState={props.heapanalyzer.modelState}
            loadedSnapshots={props.heapanalyzer.loadedSnapshots}
            currentSnapshot={props.heapanalyzer.currentSnapshot}
            operations={props.heapanalyzer.runningOperations}
            summaries={props.heapanalyzer.summaries}
            highscores={props.heapanalyzer.highscores}

            onRequestSnapshot={props.onRequestSnapshot}
            onSwitchSnapshot={props.onSwitchSnapshot}
        />
        {
            typeof props.heapanalyzer.currentSnapshot === "number" &&
                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr"}}>
                    <CollectableDisplay snapshotIndex={props.heapanalyzer.currentSnapshot} initialIndex={0}/>
                    <CollectableDisplay snapshotIndex={props.heapanalyzer.currentSnapshot} initialIndex={1}/>
                    <CollectableDisplay snapshotIndex={props.heapanalyzer.currentSnapshot} initialIndex={2}/>
                </div>
        }
        <div><button onClick={toggleGraphs}>{ showGraphs && "Hide" || "Show" }</button>
            {
                showGraphs &&
                <>
                    <SummaryGraphs data={props.heapanalyzer.summaries}/>
                    <HighscoreGraphs value={numberOfTopSpots} onChange={numberOfSpotChange}
                                     highscores={props.heapanalyzer.highscores}/>
                </>
            }
        </div>
        <div height={"500px"}></div>
        <ProgressList operations={props.heapanalyzer.runningOperations} />
    </>
}