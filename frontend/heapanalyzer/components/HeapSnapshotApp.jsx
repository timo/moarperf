//@flow
import React, { useState, useEffect } from "react";

import $ from 'jquery';

import classnames from 'classnames';

import { HashRouter, Link, Redirect, Route, Switch, withRouter, useHistory } from 'react-router-dom';

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
            <td><Link to={"/heap/find-collectables/objects/type/" + encodeURIComponent(data.name)}><Button>
                <i className={"fas fa-search"}/>
            </Button></Link> {data.name}</td>
            <td>{numberFormatter(data.size)}</td>
            <td>{numberFormatter(data.count)}</td>
        </tr>),
        frames: data => (<tr>
            <td><Link to={"/heap/find-collectables/frames/name/" + encodeURIComponent(data.name)}><Button>
                <i className={"fas fa-search"}/>
            </Button> {data.name}</Link></td>
            <td><Link to={"/heap/find-collectables/frames/file/" + encodeURIComponent(data.file)}><Button>
                <i className={"fas fa-search"}/>
            </Button>{data.file}</Link> : {data.line} <small>({data.cuid})</small></td>
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

function CollectableNavButton(props: { onClick: () => void, url: ?string, entry: any }) {
    const liStyle = {
        border: "1px solid black",
        textAlign: "center",
        background: "#eef",
    }

    if (typeof props.url === "undefined") {
        return <button style={liStyle} onClick={props.onClick}>{props.entry}</button>;
    }
    else {
        return <Link to={props.url}><button style={liStyle} onClick={(e) => { props.onClick(e); e.preventDefault() }}>{props.entry}</button></Link>;
    }
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

export function PathDisplay({pathData, onRequestNavigation, currentCollectable, makeTargetUrl}) {
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
                        entry={collectable[1]} url={makeTargetUrl(collectable[1])}/><br/><small>{reference}</small></small></ListGroupItem>
                </>
                ||
                <>
                    <ListGroupItem><small>{collectableName}<br /><CollectableNavButton
                        onClick={() => onRequestNavigation(collectable[1])}
                        entry={collectable[1]}  url={makeTargetUrl(collectable[1])}/><br/><small>{reference}</small></small></ListGroupItem>
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
    let [collectableData, setCollectableData] = useState({ snapshot: props.snapshotIndex });
    let [navigateInput, setNavigateInputText] = useState(props.index);
    let [outgoingRefs, setOutgoingRefs] = useState(undefined);
    let [incomingRefs, setIncomingRefs] = useState(undefined);

    let [selectedRefDirection, setRefDirection] = useState("out");

    let [pathData, setPathData] = useState(examplePath);

    let history = useHistory();

    function pushNavigationToHistory(entry) {
        history.push(props.makeTargetUrl(entry));
    }

    function requestOutgoingRefs() {
        if (typeof outgoingRefs === "undefined") {
            $.ajax({
                url: 'collectable-outrefs/' + encodeURIComponent(props.snapshotIndex) + '/' + encodeURIComponent(props.index),
                success: (data) => setOutgoingRefs( data )
            });
        }
    }

    function requestIncomingRefs() {
        if (typeof incomingRefs === "undefined") {
            $.ajax({
                url: 'collectable-inrefs/' + encodeURIComponent(props.snapshotIndex) + '/' + encodeURIComponent(props.index),
                success: (data) => {
                    var sum = 0;
                    data.forEach((list) => { sum += list[1].length});
                    setIncomingRefs(data);
                    setCollectableData({ ...collectableData, ["incoming-refs"]: sum });
                }
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
            url: 'path/' + encodeURIComponent(props.snapshotIndex) + '/' + encodeURIComponent(props.index),
            success: (data) => setPathData(data)
        });
    }

    useEffect(() => {
        if (collectableData.snapshot !== props.snapshotIndex || collectableData.index !== props.index) {
            setCollectableData({ snapshot: props.snapshotIndex, index: props.index });
            setIncomingRefs(undefined);
            setOutgoingRefs(undefined);
            //setPathData(examplePath);
            setNavigateInputText(props.index);
            return;
        }
        if (collectableData.hasOwnProperty("description") && collectableData.snapshot === props.snapshotIndex) {
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
            url: '/collectable-data/' + encodeURIComponent(props.snapshotIndex) + '/' + encodeURIComponent(props.index),
            success: (data) => {
                setCollectableData({ ...data, index: props.index, wantToRequest: 1, snapshot: props.snapshotIndex });
            }
        })
    }, [props.index, collectableData, props.snapshotIndex]);

    if (typeof props.snapshotIndex !== "number") {
        return (<div>Select a snapshot first ...</div>)
    }

    function navigateTo(id) {
        if (id != props.index) {
            setOutgoingRefs(undefined);
            setIncomingRefs(undefined);
            setCollectableData({index: id});
            setNavigateInputText(id);
            pushNavigationToHistory(id);
        }
    }

    function navigateViaPath(pathDesc, id) {
        setOutgoingRefs(undefined);
        setIncomingRefs(undefined);
        setCollectableData({index: id});
        setNavigateInputText(id);
        pushNavigationToHistory(id);

        let pathCopy = Array.from(pathData);

        /* put the new entry in the path list right after the entry for the current one, if
         it had been switched to earlier. */
        pathCopy.map((val, idx) => {
            if (idx % 2 == 0) {
                if (val[1] === props.index) {
                    pathCopy = pathCopy.slice(0, idx);
                }
            }
        });

        setPathData(Array.from(pathData).concat([pathDesc, [collectableData.description, props.index]]));
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
                                                                           url={props.makeTargetUrl(entry)}
                                                                           entry={entry}/>
                                    </Container>)
                            }
                            return (
                                <Container>
                                    {refTypeKey}
                                    <div style={ulStyle}>
                                        {refTypeValue.map(entry => (<CollectableNavButton key={entry}
                                                                                          onClick={() => navigateViaPath(refCategoryKey, entry)}
                                                                                          url={props.makeTargetUrl(entry)}
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
                                                               url={props.makeTargetUrl(entry)}
                                                               entry={entry}/>
                        </Container>)
                }
                return (
                    <Container>
                        {refTypeKey}
                        <div style={ulStyle}>
                            {refTypeValue.map(entry => (<CollectableNavButton key={entry}
                                                                              onClick={() => navigateViaPath("Incoming Ref", entry)}
                                                                              url={props.makeTargetUrl(entry)}
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
            <PathDisplay pathData={pathData} onRequestNavigation={navigateTo} currentCollectable={props.index} makeTargetUrl={props.makeTargetUrl}/>
            <div style={props.style}>
                {
                    props.makeCopyLeftUrl || props.makeCopyRightUrl ?
                        <div style={{float: "right"}}>
                            {
                                props.makeCopyLeftUrl ?
                                    <Link to={props.makeCopyLeftUrl()}>
                                        <Button onClick={(e) => { history.push(props.makeCopyLeftUrl()); e.preventDefault() }}>
                                            <i className={"fas fa-angle-double-left"}/></Button></Link>
                                    : <></>
                            }
                            {
                                props.makeCopyRightUrl ?
                                    <Link to={props.makeCopyRightUrl()}>
                                        <Button onClick={(e) => { history.push(props.makeCopyRightUrl()); e.preventDefault() }}>
                                            <i className={"fas fa-angle-double-right"}/></Button></Link>
                                    : <></>
                            }
                        </div>
                        : <></>
                }
                <Form inline onSubmit={(ev) => { ev.preventDefault(); navigateTo(navigateInput) }}>
                    <InputGroup><Label>Collectable {collectableKind}</Label></InputGroup>
                    <InputGroup>
                        <Input
                            value={navigateInput}
                            onChange={(ev) => setNavigateInputText(ev.target.value)}
                            onBlur={(ev) => navigateTo(navigateInput) }/>
                    </InputGroup>
                    <Label>{ collectableName }</Label>
                </Form>
                {
                    typeof collectableData.description !== "undefined" && <>
                        <Table><tbody>
                            <tr><td>Kind</td><td>{ collectableData.kind }</td></tr>
                            <tr><td>Size</td><td>{ collectableData.size } { collectableData['unmanaged-size'] === 0 ? "" : " + " + collectableData['unmanaged-size'] }</td></tr>
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

export function CollectableNavigator({heapanalyzer, match}) {
    let history = useHistory();

    function navigateLeft(target) {
        return "/heap/collectables/" + encodeURIComponent(heapanalyzer.currentSnapshot) + "/" + encodeURIComponent(target) + "/" + encodeURIComponent(match.params.rightIndex);
    }
    function navigateRight(target) {
        return "/heap/collectables/" + encodeURIComponent(heapanalyzer.currentSnapshot) + "/" + encodeURIComponent(match.params.leftIndex) + "/" + encodeURIComponent(target);
    }
    function copyToRight() {
        return "/heap/collectables/" + encodeURIComponent(heapanalyzer.currentSnapshot) + "/" + encodeURIComponent(match.params.leftIndex) + "/" + encodeURIComponent(match.params.leftIndex);
    }
    function copyToLeft() {
        return "/heap/collectables/" + encodeURIComponent(heapanalyzer.currentSnapshot) + "/" + encodeURIComponent(match.params.rightIndex) + "/" + encodeURIComponent(match.params.rightIndex);
    }

    return (
        <div style={{display: "grid", gridTemplateColumns: "1fr 3fr 1fr 3fr"}}>
            <CollectableDisplay
                snapshotIndex={heapanalyzer.currentSnapshot}
                index={match.params.leftIndex}
                makeTargetUrl={navigateLeft}
                makeCopyRightUrl={copyToRight}
            />
            <CollectableDisplay
                snapshotIndex={heapanalyzer.currentSnapshot}
                index={match.params.rightIndex}
                makeTargetUrl={navigateRight}
                makeCopyLeftUrl={copyToLeft}
            />
        </div>)
}

export function ObjectFinder(props: {modelData: any, onRequestModelData: () => void, currentSnapshot : number, match: any}) {
    let [objectData, setObjectData] = useState({snapshotNum: -1});

    let history = useHistory();

    const match = props.match;

    function categorizeObjectList(data, snapshotNum) {
        let result = [];

        for (let obj of data) {
            if (typeof result[obj.size] === "undefined") {
                result[obj.size] = [];
            }
            result[obj.size].push(obj);
        }

        setObjectData({snapshotNum: snapshotNum, data: result});
    }

    useEffect(() => {
        if (typeof objectData.data === "undefined" || objectData.snapshotNum !== props.currentSnapshot) {
            let requestedSnapshot = props.currentSnapshot;
            $.ajax({
                url: '/find/'
                    + encodeURIComponent(props.currentSnapshot) + '/'
                    + encodeURIComponent(match.params.kind) + '/'
                    + encodeURIComponent(match.params.condition) + '/'
                    + encodeURIComponent(match.params.target),
                success: (data) => {
                    if (props.currentSnapshot === requestedSnapshot)
                        categorizeObjectList(data, requestedSnapshot);
                }
            })
        }

    }, [props.currentSnapshot, match.params.kind, match.params.condition, match.params.target])

    if (typeof objectData.data === "undefined") {
        return <>Loading...</>
    }

    return <Container>
            <Table>
                <thead>
                <tr>
                    <th>Size</th>
                    <th>Objects</th>
                </tr>
                </thead>
                <tbody>
                {
                    objectData.data.map((val, index) => {
                        return <tr>
                            <td>
                                { index }
                            </td>
                            <td>
                                {
                                    val.map((val => (
                                        <CollectableNavButton
                                            onClick={() => (history.push("/heap/collectables/" + props.currentSnapshot + "/" + val.id + "/0"))}
                                            url={"/heap/collectables/" + props.currentSnapshot + "/" + val.id + "/0"}
                                            entry={val.id}/>)))
                                }
                            </td>
                        </tr>
                    })
                }
                </tbody>
            </Table>
        </Container>
}

export default function HeapSnapshotApp(props: { heapanalyzer: HeapSnapshotState, onRequestSnapshot: any, onSwitchSnapshot: any, path : any, match : any }) {
    let [numberOfTopSpots, setNumberOfTopSpots] = useState(10);
    let numberOfSpotChange = e => setNumberOfTopSpots(e.target.value);

    if (props.heapanalyzer.modelState === "nothing") {
        return <Redirect to={"/"}/>
    }

    return <>
        <Nav tabs>
            <NavItem>
                <NavLink tag={Link} to={props.match.url}>Summary and Highscores</NavLink>
            </NavItem>
            <NavItem>
                <NavLink tag={Link} to={path(props.match, "collectables/" + props.heapanalyzer.currentSnapshot + "/0/1/")}>Explorer</NavLink>
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
            <Route path={props.match.url + "/collectables/:snapshotIndex/:leftIndex/:rightIndex"} render={({location, match}) => (
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

            <Route path={props.match.url + "/find-collectables/:kind/:condition/:target"} render={({location, match}) => (
                <div>
                    <ObjectFinder
                        currentSnapshot={props.heapanalyzer.currentSnapshot}
                        modelData={props.heapanalyzer.modelData}
                        onRequestModelData={props.onRequestModelData}

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