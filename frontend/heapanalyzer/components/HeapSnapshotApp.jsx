//@flow
import React, { useState, useEffect } from "react";

import $ from 'jquery';

import classnames from 'classnames';

import { HashRouter, Link, Redirect, Route, Switch, withRouter } from 'react-router-dom';

import { Table, Container, Form, Input, InputGroup, ListGroup, ListGroupItem, Label, Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';

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

function CollectableNavButton(props: { onClick: () => void, entry: any }) {
    const liStyle = {
        border: "1px solid black",
        textAlign: "center",
        background: "#eef",
    }

    return <button style={liStyle} onClick={props.onClick}>{props.entry}</button>;
}

export function PathDisplay({pathData, onRequestNavigation, currentCollectable}) {
    let pairList = [];
    let i = 0;
    while (i < pathData.length - 1) {
        pairList.push([pathData[i++], pathData[i++]]);
    }

    return (<div><ListGroup flush>
        {
            pairList.map(([collectable, reference]) => (
                currentCollectable === collectable[1]
                &&
                <>
                    <ListGroupItem><small> » {collectable[0]} <CollectableNavButton onClick={() => onRequestNavigation(collectable[1])} entry={collectable[1]}/> « <br /><small>{reference}</small></small></ListGroupItem>
                </>
                ||
                <>
                    <ListGroupItem><small>{collectable[0]} <CollectableNavButton onClick={() => onRequestNavigation(collectable[1])} entry={collectable[1]}/><br /><small>{reference}</small></small></ListGroupItem>
                </>
            ))
        }
    </ListGroup>
    </div>)
}

const examplePath = [
    ["Root",0],"VM Instance Roots",
    ["VM Instance Roots",2],"Specialization log queue",
    ["BOOTQueue (Object)",488784],"Unknown",
    ["<anon MVMSpeshLog> (Object)",488833],"Type entry",
    ["Str::CombN (Type Object)",488604],"<STable>",
    ["Str::CombN (STable)",488601],"HOW",
    ["Perl6::Metamodel::ClassHOW (Object)",488609],"Unknown",
    ["<anon Uninstantiable> (Type Object)",488616]];


export function CollectableDisplay(props: any) {
    let [collectableData, setCollectableData] = useState({ index: props.initialIndex });
    let [navigateInput, setNavigateInputText] = useState(props.initialIndex);
    let [outgoingRefs, setOutgoingRefs] = useState(undefined);
    let [incomingRefs, setIncomingRefs] = useState(undefined);

    let [pathData, setPathData] = useState(examplePath);

    function requestOutgoingRefs() {
        if (typeof collectableData.outrefs === "undefined") {
            $.ajax({
                url: 'collectable-outrefs/' + props.snapshotIndex + '/' + collectableData.index,
                success: (data) => setCollectableData({...collectableData, outrefs: data})
            });
        }
    }

    function requestPath() {
        $.ajax({
            url: 'path/' + props.snapshotIndex + '/' + collectableData.index,
            success: (data) => setPathData(data)
        });
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

    if (typeof props.snapshotIndex !== "number") {
        return (<div>Select a snapshot first ...</div>)
    }

    function navigateTo(id) {
        if (id !== collectableData.index) {
            setOutgoingRefs(undefined);
            setIncomingRefs(undefined);
            setCollectableData({index: id});
            setNavigateInputText(id);
        }
    }

    function navigateViaPath(pathDesc, id) {
        setOutgoingRefs(undefined);
        setIncomingRefs(undefined);
        setCollectableData({index: id});
        setNavigateInputText(id);
        setPathData(Array.from(pathData).concat([pathDesc, [collectableData.description, collectableData.index]]));
    }

    const ulStyle = {
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-evenly"
    };

    var outerEntries = [];

    if (typeof collectableData.outrefs !== "undefined") {
        outerEntries = Object.entries(collectableData.outrefs);
        outerEntries.sort();
    }

    let outrefsData = (
        collectableData.hasOwnProperty("outrefs") &&
        outerEntries.map(([refCategoryKey, refCategoryValue], index) => (
            <div style={{paddingLeft: "0.2em"}}>
                { refCategoryKey }
                {
                    Object.entries(refCategoryValue).map(([refTypeKey, refTypeValue], index) => {
                        if (refTypeValue.length === 1) {
                            let entry = refTypeValue[0];
                            return (
                                <Container>
                                    {refTypeKey} <CollectableNavButton key={entry} onClick={() => navigateViaPath(refCategoryKey, entry)} entry={entry}/>
                                </Container>)
                        }
                        return (
                            <Container>
                                {refTypeKey}
                                <div style={ulStyle}>
                                    {refTypeValue.map(entry => (<CollectableNavButton key={entry} onClick={() => navigateViaPath(refCategoryKey, entry)} entry={entry}/>))}
                                </div>
                            </Container>)
                    })
                }
            </div>
        ))
        ||
        <tr><td><button onClick={() => requestOutgoingRefs()}>Load</button></td></tr>
    )

    let descr = typeof collectableData.description === "undefined" ? " ()" : collectableData.description;
    var collectableKind;
    var collectableName = descr;
    if (descr.indexOf("(") != -1) {
        collectableKind = descr.substr(descr.lastIndexOf("("));
        collectableName = descr.substr(0, descr.lastIndexOf("(") - 1);
    }

    return (
        <>
            <PathDisplay pathData={pathData} onRequestNavigation={navigateTo} currentCollectable={collectableData.index}/>
            <div style={props.style}>
                <Form inline onSubmit={(ev) => { ev.preventDefault(); navigateTo(navigateInput) }}>
                    <InputGroup><Label>Collectable {collectableKind}</Label></InputGroup>
                    <InputGroup>
                        <Input
                            value={navigateInput}
                            onChange={(ev) => setNavigateInputText(ev.target.value)}
                            onBlur={(ev) => navigateTo(navigateInput) }/>
                        <Label>{ collectableName }</Label>
                    </InputGroup>
                </Form>
                {
                    typeof collectableData.description !== "undefined" && <>
                        <Table><tbody>
                            <tr><td>Kind</td><td>{ collectableData.kind }</td></tr>
                            <tr><td>Size</td><td>{ collectableData.size } + { collectableData.unmanagedSize }</td></tr>
                            <tr><td rowSpan={2}>References</td><td>{ collectableData['outgoing-refs'] } outgoing</td></tr>
                            <tr><td>{ collectableData['incoming-refs'] } incoming</td></tr>
                            <tr><td colSpan={2}><button onClick={requestPath}>Show Path</button></td></tr>
                        </tbody></Table>
                        <div>
                            <div style={{textAlign: "center"}}>Outgoing References</div>
                            { outrefsData }
                        </div>
                    </>
                }
            </div>
        </>
    )
}

const path = (match, extra) => ((match.url.endsWith("/") ? match.url : match.url + "/") + extra);

export function CollectableNavigator({heapanalyzer}) {

    return (
        <div style={{display: "grid", gridTemplateColumns: "1fr 3fr 1fr 3fr"}}>
            <CollectableDisplay snapshotIndex={heapanalyzer.currentSnapshot} initialIndex={0}/>
            <CollectableDisplay snapshotIndex={heapanalyzer.currentSnapshot} initialIndex={1}/>
        </div>)
}

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
                <CollectableNavigator heapanalyzer={props.heapanalyzer}/>
                )} />

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