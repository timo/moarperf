//@flow
import React, { useState, useEffect } from "react";

import $ from 'jquery';

import classnames from 'classnames';

import { HashRouter, Link, Redirect, Route, Switch, withRouter } from 'react-router-dom';

import { Table, Container, Form, Input, InputGroup, Label, Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';

import type {HeapSnapshotState, OperationHandle} from '../reducer';
import SnapshotList from './SnapshotList';
import { SummaryGraphs, HighscoreGraphs } from './Graphs';

import { numberFormatter } from './SnapshotList';

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

export function TypeFrameListing(props: { modelData: any, onRequestModelData: () => void, currentSnapshot : number, highscores: any}) {
    let [selectedKind, setSelectedKind] = useState("types");
    let [highscoreData, setHighscoreData] = useState({});
    let [sortMethod, setSortMethod] = useState("size");

    useEffect(() => {
        if (typeof props.modelData === "undefined") {
            props.onRequestModelData();
        }
    }, [props.currentSnapshot]);

    const idFunc = {
        types:  data => (data.name),
        frames: data => ((data.name === "" ? "<anon>" : data.name) + " " + data.file + ":" + data.line),
    };

    if (typeof props.modelData === "undefined") {
        return <div>Loading...</div>
    }

    const rowFunc = {
        types:  data => (<tr>
            <td><small>{data.repr}</small></td>
            <td>{data.name}</td>
            <td>{numberFormatter(data.size)}</td>
            <td>{numberFormatter(data.count)}</td>
        </tr>),
        frames: data => (<tr>
            <td>{data.name}</td>
            <td>{data.file} : {data.line} <small>({data.cuid})</small></td>
            <td>{numberFormatter(data.size)}</td>
            <td>{numberFormatter(data.count)}</td></tr>),
    };

    let tableContents = <>
        <thead><tr>{
            selectedKind === "types"
            && <>
                <th style={{width: "20%"}}>REPR</th>
                <th style={{width: "50%"}}>Name</th>
                <th style={{width: "15%"}}>Size</th>
                <th style={{width: "15%"}}>Count</th>
            </>
            || <>
                <th style={{width: "30%"}}>Name</th>
                <th style={{width: "40%"}}>Location</th>
                <th style={{width: "15%"}}>Size</th>
                <th style={{width: "15%"}}>Count</th>
            </>
        }</tr></thead>
        <tbody>
        {
            Array.from(props.modelData[selectedKind]).splice(0, 100).map((entry) => {
                    let data = {...entry};
                    let bySize = props.highscores[selectedKind + "_by_size"][props.currentSnapshot];
                    let byCount = props.highscores[selectedKind + "_by_count"][props.currentSnapshot];

                    if (typeof bySize !== "undefined" && typeof byCount !== "undefined") {
                        if (bySize.hasOwnProperty(idFunc[selectedKind](data))) {
                            data.size = bySize[idFunc[selectedKind](data)];
                        }
                        if (byCount.hasOwnProperty(idFunc[selectedKind](data))) {
                            data.count = byCount[idFunc[selectedKind](data)];
                        }
                    }
                    return rowFunc[selectedKind](data);
                }
            )
        }
        </tbody>
    </>;
    return (
        <>
            <Nav tabs>
                <NavItem><NavLink className={classnames({active: selectedKind === "types"})}  onClick={() => setSelectedKind("types")}>Types</NavLink></NavItem>
                <NavItem><NavLink className={classnames({active: selectedKind === "frames"})} onClick={() => setSelectedKind("frames")}>Frames</NavLink></NavItem>
            </Nav>
            <TabContent activeTab={"the_one_tab"}>
                <TabPane tabId={"the_one_tab"}><Container>
                    <Table style={{ tableLayout: "fixed"}}>
                        {tableContents}
                    </Table>
                </Container></TabPane>
            </TabContent>
        </>
    )
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
    }, [collectableData, props.snapshotIndex]);


    function navigateTo(id) {
        setOutgoingRefs(undefined);
        setIncomingRefs(undefined);
        setCollectableData({index: id});
        setNavigateInputText(id);
    }

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
        <>
            <div style={props.style}>
                <Form inline onSubmit={(ev) => { ev.preventDefault(); navigateTo(navigateInput) }}>
                    <InputGroup>
                        <Label>Collectable</Label>
                        <Input
                            value={navigateInput}
                            onChange={(ev) => setNavigateInputText(ev.target.value)}
                            onBlur={(ev) => navigateTo(navigateInput) }/>
                        <Label>{ collectableData.hasOwnProperty("description") && collectableData.description }</Label>
                    </InputGroup>
                </Form>
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

const path = (match, extra) => ((match.url.endsWith("/") ? match.url : match.url + "/") + extra);

export default function HeapSnapshotApp(props: { heapanalyzer: HeapSnapshotState, onRequestSnapshot: any, onSwitchSnapshot: any, path : any, match : any }) {
    let [numberOfTopSpots, setNumberOfTopSpots] = useState(10);
    let numberOfSpotChange = e => setNumberOfTopSpots(e.target.value);

    return <>
        <Nav tabs>
            <NavItem>
                <NavLink tag={Link} to={props.match.url}>Summary and Highscores</NavLink>
            </NavItem>
            <NavItem>
                <NavLink tag={Link} to={path(props.match, "collectables")}>Explorer</NavLink>
            </NavItem>
            <NavItem>
                <NavLink tag={Link} to={path(props.match, "types-frames")}>Type & Frame Lists</NavLink>
            </NavItem>
        </Nav>

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

        <Switch>
            <Route path={props.match.url + "/collectables"} render={({location, match}) => (
                <div style={{display: "grid", gridTemplateColumns: "1fr 3fr 1fr 3fr"}}>

                    <div><ul><li>Link</li><li>Link</li><li>Link</li><li>Link</li></ul></div>

                    <CollectableDisplay snapshotIndex={props.heapanalyzer.currentSnapshot} initialIndex={0}/>

                    <div><ul><li>Link</li><li>Link</li><li>Link</li><li>Link</li></ul></div>

                    <CollectableDisplay snapshotIndex={props.heapanalyzer.currentSnapshot} initialIndex={1}/>

                </div>)} />

            <Route path={props.match.url + "/types-frames"} render={({location, match}) => (
                <div>
                    <TypeFrameListing
                        currentSnapshot={props.heapanalyzer.currentSnapshot}
                        modelData={props.heapanalyzer.modelData}
                        onRequestModelData={props.onRequestModelData}

                        highscores={props.heapanalyzer.highscores}
                    />
                </div>)} />

            <Route path={props.match.url + "/"} exact>
                <>
                <div>
                    <SummaryGraphs data={props.heapanalyzer.summaries}/>
                    <HighscoreGraphs value={numberOfTopSpots} onChange={numberOfSpotChange}
                                     highscores={props.heapanalyzer.highscores}/>
                </div>
                <div height={"500px"}></div>
                </>
            </Route>
        </Switch>
        <ProgressList operations={props.heapanalyzer.runningOperations} />
    </>
}