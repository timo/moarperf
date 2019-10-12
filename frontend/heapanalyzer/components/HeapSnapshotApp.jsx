//@flow
import React, { useState, useEffect } from "react";

import $ from 'jquery';

import classnames from 'classnames';

import { HashRouter, Link, Redirect, Route, Switch, withRouter } from 'react-router-dom';

import { Button, Table, Container, Form, Input, InputGroup, ListGroup, ListGroupItem, Label, Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';

import type {HeapSnapshotState, OperationHandle} from '../reducer';
import SnapshotList from './SnapshotList';
import { SummaryGraphs, HighscoreGraphs } from './Graphs';

import { numberFormatter } from './SnapshotList';

const path = (match, extra) => ((match.url.endsWith("/") ? match.url : match.url + "/") + extra);

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

export function TypeFrameListing(props: { modelData: any, onRequestModelData: () => void, currentSnapshot : number, highscores: any }) {
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
            <td><Link to={""}><Button>
                <i className={"fas fa-search"}/>
            </Button></Link> {data.name}</td>
            <td>{numberFormatter(data.size)}</td>
            <td>{numberFormatter(data.count)}</td>
        </tr>),
        frames: data => (<tr>
            <td><Link to={""}><Button>
                <i className={"fas fa-search"}/>
            </Button> {data.name}</Link></td>
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
            typeof props.highscores !== "undefined" &&
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

export function splitObjectDescr(descr) {
    descr = typeof descr === "undefined" ? " ()" : descr;
    var collectableKind;
    var collectableName = descr;
    if (descr.indexOf("(") != -1) {
        collectableKind = descr.substr(descr.lastIndexOf("("));
        collectableName = descr.substr(0, descr.lastIndexOf("(") - 1);
    }
    return [collectableKind, collectableName];
}

export function PathDisplay({pathData, onRequestNavigation, currentCollectable}) {
    let pairList = [];
    let i = 0;
    while (i < pathData.length - 1) {
        pairList.push([pathData[i++], pathData[i++]]);
    }

    return (<div><ListGroup flush>
        {
            pairList.map(([collectable, reference]) => {
                let [collectableKind, collectableName] = splitObjectDescr(collectable[0]);

                return (
                currentCollectable === collectable[1]
                &&
                <>
                    <ListGroupItem><small> » {collectableName} « <br /><CollectableNavButton
                        onClick={() => onRequestNavigation(collectable[1])}
                        entry={collectable[1]}/><br/><small>{reference}</small></small></ListGroupItem>
                </>
                ||
                <>
                    <ListGroupItem><small>{collectableName}<br /><CollectableNavButton
                        onClick={() => onRequestNavigation(collectable[1])}
                        entry={collectable[1]}/><br/><small>{reference}</small></small></ListGroupItem>
                </>
                )
            })
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

    let [selectedRefDirection, setRefDirection] = useState("out");

    let [pathData, setPathData] = useState(examplePath);

    function requestOutgoingRefs() {
        if (typeof outgoingRefs === "undefined") {
            $.ajax({
                url: 'collectable-outrefs/' + props.snapshotIndex + '/' + collectableData.index,
                success: (data) => setOutgoingRefs( data )
            });
        }
    }

    function requestIncomingRefs() {
        if (typeof incomingRefs === "undefined") {
            $.ajax({
                url: 'collectable-inrefs/' + props.snapshotIndex + '/' + collectableData.index,
                success: (data) => setIncomingRefs( data )
            });
        }
    }

    function selectRefDirection(direction) {
        setRefDirection(direction);
        if (direction === "in" && collectableData.hasOwnProperty("incoming-refs") && typeof incomingRefs === "undefined") {
            requestIncomingRefs()
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
                if (collectableData.hasOwnProperty("incoming-refs") && collectableData["incoming-refs"] < 128 && selectedRefDirection === "in") {
                    requestIncomingRefs();
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
        if (id != collectableData.index) {
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

        let pathCopy = Array.from(pathData);

        /* put the new entry in the path list right after the entry for the current one, if
         it had been switched to earlier. */
        pathCopy.map((val, idx) => {
            if (idx % 2 == 0) {
                if (val[1] === collectableData.index) {
                    pathCopy = pathCopy.slice(0, idx);
                }
            }
        });

        setPathData(Array.from(pathData).concat([pathDesc, [collectableData.description, collectableData.index]]));
    }

    const ulStyle = {
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-evenly"
    };

    var refEntries = [];

    if (selectedRefDirection === "out") {
        if (typeof outgoingRefs !== "undefined") {
            refEntries = Object.entries(outgoingRefs);
            refEntries.sort();
        }
    }
    else if (selectedRefDirection === "in") {
        if (typeof incomingRefs !== "undefined") {
            refEntries = Array.from(incomingRefs);
            refEntries.sort();
        }
    }

    var refsData;

    if (selectedRefDirection === "out") {
        refsData = (
            refEntries.length > 0 &&
            refEntries.map(([refCategoryKey, refCategoryValue], index) => (
                <div style={{paddingLeft: "0.2em"}}>
                    {refCategoryKey}
                    {
                        Object.entries(refCategoryValue).map(([refTypeKey, refTypeValue], index) => {
                            if (refTypeValue.length === 1) {
                                let entry = refTypeValue[0];
                                return (
                                    <Container>
                                        {refTypeKey} <CollectableNavButton key={entry}
                                                                           onClick={() => navigateViaPath(refCategoryKey, entry)}
                                                                           entry={entry}/>
                                    </Container>)
                            }
                            return (
                                <Container>
                                    {refTypeKey}
                                    <div style={ulStyle}>
                                        {refTypeValue.map(entry => (<CollectableNavButton key={entry}
                                                                                          onClick={() => navigateViaPath(refCategoryKey, entry)}
                                                                                          entry={entry}/>))}
                                    </div>
                                </Container>)
                        })
                    }
                </div>
            ))
            ||
            <tr>
                <td>
                    <button onClick={() => requestOutgoingRefs()}>Load</button>
                </td>
            </tr>
        )
    }
    else if (selectedRefDirection === "in") {
        refsData = (
            refEntries.length > 0 &&
            refEntries.map(([refTypeKey, refTypeValue], index) => {
                if (refTypeValue.length === 1) {
                    let entry = refTypeValue[0];
                    return (
                        <Container>
                            {refTypeKey} <CollectableNavButton key={entry}
                                                               onClick={() => navigateViaPath("Incoming Ref", entry)}
                                                               entry={entry}/>
                        </Container>)
                }
                return (
                    <Container>
                        {refTypeKey}
                        <div style={ulStyle}>
                            {refTypeValue.map(entry => (<CollectableNavButton key={entry}
                                                                              onClick={() => navigateViaPath("Incoming Ref", entry)}
                                                                              entry={entry}/>))}
                        </div>
                    </Container>)
            })
            ||
            <tr>
                <td>
                    <button onClick={() => requestIncomingRefs()}>Load</button>
                </td>
            </tr>
        )
    }

    let [collectableKind, collectableName] = splitObjectDescr(collectableData.description);

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
                            <Nav tabs>
                                <NavItem>
                                    <NavLink onClick={() => selectRefDirection("out")} className={classnames({active: selectedRefDirection === "out"})}>Outgoing Refs</NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink onClick={() => selectRefDirection("in")} className={classnames({active: selectedRefDirection === "in"})}>Incoming Refs</NavLink>
                                </NavItem>
                            </Nav>
                            { refsData }
                        </div>
                    </>
                }
            </div>
        </>
    )
}

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

            match={props.match}
        />

        <Switch>
            <Route path={props.match.url + "/collectables"} render={({location, match}) => (
                <CollectableNavigator heapanalyzer={props.heapanalyzer}
                                      match={match}/>
                )} />

            <Route path={props.match.url + "/types-frames"} render={({location, match}) => (
                <div>
                    <TypeFrameListing
                        currentSnapshot={props.heapanalyzer.currentSnapshot}
                        modelData={props.heapanalyzer.modelData}
                        onRequestModelData={props.onRequestModelData}

                        highscores={props.heapanalyzer.highscores}

                        match={match}
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