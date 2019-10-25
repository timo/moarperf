//@flow
import React, { useState, useEffect, useReducer } from "react";

import $ from 'jquery';

import classnames from 'classnames';

import { HashRouter, Link, Redirect, Route, Switch, withRouter, useHistory } from 'react-router-dom';

import {
    Button,
    ButtonGroup,
    UncontrolledButtonDropdown, DropdownMenu, DropdownItem, DropdownToggle,
    Table,
    Container,
    Row,
    Col,
    Form,
    Input,
    InputGroup,
    ListGroup,
    ListGroupItem,
    ListGroupItemHeading,
    ListGroupItemText,
    Label,
    Nav,
    NavItem,
    NavLink,
    TabContent,
    TabPane
} from 'reactstrap';

import type {HeapSnapshotState, OperationHandle} from '../reducer';
import SnapshotList from './SnapshotList';
import { SummaryGraphs, HighscoreGraphs } from './Graphs';

import { numberFormatter } from './SnapshotList';

const path = (match, extra) => ((match.url.endsWith("/") ? match.url : match.url + "/") + extra);

// stolen from https://stackoverflow.com/a/52171480/804005
const stringHash = s => {for(var i=0,h=6;i<s.length;)h=Math.imul(h^s.charCodeAt(i++),9**9);return h^h>>>9}

export function ProgressList(props: { operations: {[string]: OperationHandle}}) {
    var output = [];
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
            </Button>{" " }</Link> {data.name}</td>
            <td>{numberFormatter(data.size)}</td>
            <td>{numberFormatter(data.count)}</td>
        </tr>),
        frames: data => (<tr>
            <td><Link to={"/heap/find-collectables/frames/name/" + encodeURIComponent(data.name)}><Button>
                <i className={"fas fa-search"}/>
            </Button>{" "} {data.name}</Link></td>
            <td><Link to={"/heap/find-collectables/frames/file/" + encodeURIComponent(data.file)}><Button>
                <i className={"fas fa-search"}/>
            </Button>{" "}{data.file}</Link> : {data.line} <small>({data.cuid})</small></td>
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
                                            <i className={"fas fa-angle-double-left fa-2x"}/></Button></Link>
                                    : <></>
                            }
                            {
                                props.makeCopyRightUrl ?
                                    <Link to={props.makeCopyRightUrl()}>
                                        <Button onClick={(e) => { history.push(props.makeCopyRightUrl()); e.preventDefault() }}>
                                            <i className={"fas fa-angle-double-right fa-2x"}/></Button></Link>
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
                            <tr><td colSpan={2}>
                                <Button onClick={requestPath}><i className={"fas fa-route fa-lg"}/> Path</Button> {" "}
                                <Link tag={Button} url={"/heap/network-view/" + props.snapshotIndex + "/" + collectableData.index}><i className={"fas fa-project-diagram fa-lg"}/> Network</Link>
                            </td></tr>
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

export function CollectableNavigator({heapanalyzer, match, onSwitchSnapshot}) {
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

    useEffect(() => {
        console.log(match.params.snapshotIndex, heapanalyzer.currentSnapshot);
        if (match.params.snapshotIndex != heapanalyzer.currentSnapshot) {
            requestIdleCallback(() => onSwitchSnapshot(parseInt(match.params.snapshotIndex)));
        }
    }, [match.params.snapshotIndex, heapanalyzer.currentSnapshot]);

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

const initialNetworkState = {collectables: {}, layers: {}, inrefs: {}};
function networkReducer(state, action) {
    switch (action.type) {
        case "collectable-data":
            let distance = action.data["distance-from-root"];
            var layerData = state.layers[distance];
            var deleteFromUndefinedLayer = false;
            if (typeof layerData === "undefined") {
                layerData = {}
            }
            if (typeof distance !== "undefined") {
                if (layerData.hasOwnProperty(distance) && state.collectables.hasOwnProperty(action.index)) {
                    return state;
                }
                if (layerData.hasOwnProperty("undefined") && layerData["undefined"].hasOwnProperty(action.index)) {
                    deleteFromUndefinedLayer = true;
                }
            }
            let [kind, name] = splitObjectDescr(action.data.description);
            const dataToInstall = {
                ...action.data,
                index: action.index,
                descrOnly: name,
                kindOnly: kind,
            };
            return {
                ...state,
                collectables: {
                    ...state.collectables, [action.index]: dataToInstall,
                },
                layers: (!deleteFromUndefinedLayer
                    ? {
                        ... state.layers,
                        [distance]: {
                            ...layerData, [action.index]: dataToInstall,
                        }
                    }
                    : {
                        ... state.layers,
                        [distance]: {
                            ...layerData, [action.index]: dataToInstall,
                        },
                        "undefined": { ...layerData[undefined], [action.index]: undefined }
                    })
                }
        case "collectable-inrefs":
            return {
                ...state,
                inrefs: {
                    ...state.inrefs,
                    [action.index]: action.data,
                }
            }
        default:
            throw new Error("unknown action type " + action.type + " in the NetworkView reducer");
    }
}

export function NetworkCollectableButton(props: {entry: any, symbol: string, style: any, leftSymbol: string}) {
    return (
        <ButtonGroup style={props.style}>
            {
                typeof props.leftSymbol === "string" ? <Button color={props.color}><i className={"fas fa-" + props.leftSymbol} /></Button> : <></>
            }
            <Button color={props.color}>{props.entry.index}</Button>
            <Button color={props.color}><i className={"fas fa-" + props.symbol} /></Button>
        </ButtonGroup>
    )
}

const buttonList = [
    "cat",
    "crow",
    "dog",
    "dove",
    "dragon",
    "feather-alt",
    "fish",
    "frog",
    "hippo",
    "horse",
    "horse-head",
    "kiwi-bird",
    "otter",
    "paw",
    "spider",
    "apple-alt",
    "bacon",
    "bone",
    "bread-slice",
    "candy-cane",
    "carrot",
    "cheese",
    "cloud-meatball",
    "cookie",
    "drumstick-bite",
    "egg",
    "fish",
    "hamburger",
    "hotdog",
    "ice-cream",
    "lemon",
    "pepper-hot",
    "pizza-slice",
    "seedling",
    "stroopwafel",
];

const buttonsInGrid = [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
    [8, 9, 10, 11],
    [12, 13, 14, 15],
    [16, 17, 18, 19],
    [20, 21, 22, 23],
    [24, 25, 26, 27],
    [28, 29, 30, 31],
    [32]
];

function ObjectTypeConfigurator(props: { keyText: string, value: unknown, suggestedColor: string, suggestedIcon: string, onChangeColor: function, onChangeSymbol: function }) {
    let [color, setColorState] = useState(props.suggestedColor);
    let [symbolState, setSymbolState] = useState(undefined)

    let symbol = typeof symbolState === "undefined" ? props.suggestedIcon : symbolState;

    const setColor = (color) => { setColorState(color); if (typeof props.onChangeColor !== "undefined") { props.onChangeColor(color) } };
    const setSymbol = (symbol) => {
        setSymbolState(symbol);
        console.log("configurator for " + props.keyText + " had " + props.suggestedIcon + " but user set it to " + symbol);
        if (typeof props.onChangeSymbol !== "undefined") { props.onChangeSymbol(symbol) }
    };

    const colorlist = ["primary", "secondary", "success", "info", "warning", "danger"];

    const actualColor   = color === "hidden" ? "primary" : color;
    const buttonOutline = color === "hidden";

    return <ListGroupItem>
        <ListGroupItemHeading>{props.keyText}</ListGroupItemHeading>
        <ListGroupItemText>
            <ButtonGroup>
                <Button color={actualColor} outline={buttonOutline}>
                    {props.value.objects.length + props.value.typeobjects.length + props.value.other.length} <small>items</small>
                </Button>
                <UncontrolledButtonDropdown>
                    <DropdownToggle color={actualColor} outline={buttonOutline}>Color</DropdownToggle>
                    <DropdownMenu>
                        <ButtonGroup style={{width: "100%"}} vertical>
                        <Button onClick={(e) => (setColor("hidden"))} outline>Hidden</Button>
                        {
                            colorlist.map(color => (
                                <Button color={color} onClick={(e) => (setColor(color))}>{ color }</Button>
                            ))
                        }
                        </ButtonGroup>
                    </DropdownMenu>
                </UncontrolledButtonDropdown>
                <UncontrolledButtonDropdown>
                    <DropdownToggle color={actualColor} outline={buttonOutline}><i className={"fas fa-2x fa-" + symbol}/></DropdownToggle>
                    <DropdownMenu>
                        <ButtonGroup style={{width: "100%"}} vertical>
                            {
                                buttonsInGrid.map((row) => (
                                    <ButtonGroup>
                                        {
                                        row.map((idx) => {
                                            const symbol = buttonList[idx];
                                            return <Button color={actualColor} outline={buttonOutline} onClick={(e) => (setSymbol(symbol))}><i
                                                className={"fas fa-2x fa-" + symbol}/></Button>
                                        })
                                        }
                                    </ButtonGroup>
                                ))
                            }
                        </ButtonGroup>
                    </DropdownMenu>
                </UncontrolledButtonDropdown>
            </ButtonGroup>
        </ListGroupItemText>
    </ListGroupItem>;
}

function configReducer(state, action) {
    if (state[action.kind][action.descr] === action.value) {
        console.log("value of " + action.kind + " " + action.descr + " is already " + action.value);
        return state;
    }
    console.log("reducer set " + action.kind + " " + action.descr + " to " + action.value);
    return (
        {
            ...state,
            [action.kind]: {
                ...state[action.kind],
                [action.descr]: action.value
            }
        }
    )
}

export function NetworkView(props: {modelData: any, snapshotIndex: number, startingPoint: number, match: any }) {
    let [networkState, dispatch] = useReducer(networkReducer, initialNetworkState);
    let [selectionState, setSelectionState] = useState({index: props.startingPoint});

    let [configurationState, dispatchConfigAction] = useReducer(configReducer,{color: {}, symbol: {}});

    function getConfiguration(descr, kind) {
        if (typeof descr === "undefined") {
            return ""
        }
        if (typeof configurationState[kind][descr] === "undefined") {
            if (kind === "symbol") {
                let stringHash1 = stringHash(descr);
                const suggestedSymbol = buttonList[Math.abs(stringHash1 % buttonList.length)];
                dispatchConfigAction({kind: kind, descr: descr, value: suggestedSymbol});
                console.log("setting symbol of " + descr + " to " + suggestedSymbol);
                return suggestedSymbol;
            }
            else {
                return "secondary";
            }
        }
        else {
            return configurationState[kind][descr];
        }
    }

    useEffect(() => {
        if (!networkState.collectables.hasOwnProperty(props.startingPoint)) {
            function requestIndividualCollectableData(snapshotIndex, index, callback) {
                $.ajax({
                    url: '/collectable-data/' + encodeURIComponent(snapshotIndex) + '/' + encodeURIComponent(index),
                    success: (data) => {
                        dispatch({
                            type: "collectable-data",
                            data,
                            index: index
                        });
                        if (typeof callback === "function") { callback(data, snapshotIndex, index); }
                    }
                });
            }
            function requestPathObjects(snapshotIndex, index, perObjectCallback, onceFinishedCallback) {
                $.ajax({
                    url: 'path/' + encodeURIComponent(props.snapshotIndex) + '/' + encodeURIComponent(props.startingPoint),
                    success: (data) => {
                        let i = 0;
                        console.log("path data received");
                        while (i < data.length - 1) {
                            let [descr, objIdx] = data[i++];
                            let linkname = data[i++];
                            if (typeof networkState.collectables[objIdx] === "undefined") {
                                requestIndividualCollectableData(snapshotIndex, objIdx);
                            }
                            if (typeof perObjectCallback === "function") { perObjectCallback(snapshotIndex, objIdx, descr) }
                        }
                        if (typeof onceFinishedCallback === "function") { onceFinishedCallback(snapshotIndex, index) }
                    }
                });
            }
            function getStartingPointData(mayRedo = true) {
                requestIndividualCollectableData(props.snapshotIndex, props.startingPoint,
                (data, snapshotIndex, index) => {
                    let needsToRedoInitial = typeof data["distance-from-root"] === "undefined" && mayRedo;
                    if (mayRedo) {
                        requestPathObjects(props.snapshotIndex, props.startingPoint,
                                () => 1,
                                () => {
                                    if (needsToRedoInitial) {
                                        getStartingPointData(false)
                                    }
                                }
                            );
                        }
                    }
                );
                $.ajax({
                    url: '/collectable-inrefs/' + encodeURIComponent(props.snapshotIndex) + '/' + encodeURIComponent(props.startingPoint),
                    success: (data) => {
                        var allKeys = [];
                        data.map(([category, entries]) => {
                            entries.map((objIdx) => {
                                requestIndividualCollectableData(props.snapshotIndex, objIdx);
                                requestPathObjects(props.snapshotIndex, objIdx);
                                allKeys.push(objIdx);
                            })
                        });
                        dispatch({
                            type: "collectable-inrefs",
                            index: props.startingPoint,
                            data: allKeys,
                        });
                    }
                });
            }
            getStartingPointData();
        }
    });

    let allPathObjects = {};
    let next = props.startingPoint;
    while (next != 0) {
        allPathObjects[next] = true;
        const collectableInfo = networkState.collectables[next];
        if (typeof collectableInfo !== "undefined") {
            next = collectableInfo["towards-root"];
        } else {
            next = 0
        }
    }

    let objectPerDescription = {};
    Object.entries(networkState.collectables).forEach(([key, value]) => {
        let [kind, name] = splitObjectDescr(value.description);
        if (!objectPerDescription.hasOwnProperty(name)) {
            objectPerDescription[name] = {objects: [], typeobjects: [], other: []};
        }
        let keyForKind = kind === "(Object)" ? "objects" : kind === "(Typeobject)" ? "typeobjects" : "other";
        objectPerDescription[name][keyForKind].push(value);
    });

    return <Container>
        <Row>
            <Col xs={3}>
                <h1>Overview</h1>
                <ListGroup>
                    {
                        Object.entries(objectPerDescription).map(([key, value]) => {
                            let symbol = getConfiguration(key, "symbol");
                            let color = getConfiguration(key, "color");
                            return <ObjectTypeConfigurator
                                keyText={key}
                                value={value}
                                suggestedColor={color}
                                suggestedIcon={symbol}

                                onChangeColor={(color) => dispatchConfigAction({ kind: "color", descr: key, value: color })}
                                onChangeSymbol={(symbol) => dispatchConfigAction({ kind: "symbol", descr: key, value: symbol })}
                            />
                        })
                    }
                </ListGroup>
            </Col>
            <Col>
                <Row>
                    <h1>Network view</h1>
                </Row>
                {
                    Object.entries(networkState.layers).reverse().map(([key, layer]) => {
                        return <Row><Col>
                            <h2>Layer { key }</h2>
                            {
                                Object.entries(layer).map(([collKey, obj]) => {
                                    var symbol;
                                    if (collKey === props.startingPoint) {
                                        symbol = "map-marker-alt"
                                    }
                                    else if (allPathObjects.hasOwnProperty(collKey)) {
                                        symbol = "route";
                                    }
                                    else if (networkState.inrefs.hasOwnProperty(props.startingPoint)
                                        && networkState.inrefs[props.startingPoint].includes(parseInt(collKey))) {
                                        symbol = "sign-in-alt";
                                    }
                                    let leftSymbol = getConfiguration(obj.descrOnly, "symbol");
                                    let color = getConfiguration(obj.descrOnly, "color");
                                    if (color === "hidden") {
                                        return <></>
                                    }
                                    return [
                                        <NetworkCollectableButton entry={obj} color={color} leftSymbol={leftSymbol} symbol={symbol} style={{paddingTop:"0.2em"}}/>,
                                        " "
                                    ]
                                })
                            }
                        </Col></Row>
                    })
                }
            </Col>
        </Row>
    </Container>
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
        <h1>{match.params.kind} with a {match.params.condition} of {match.params.target}</h1>
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

    let history = useHistory();

    if (props.heapanalyzer.modelState === "nothing") {
        return <Redirect to={"/"}/>
    }

    return <>
        <Nav tabs>
            <NavItem>
                <NavLink tag={Link} to={props.match.url}>Summary and Highscores</NavLink>
            </NavItem>
            <NavItem>
                <NavLink tag={Link} to={path(props.match, "collectables/" + (props.heapanalyzer.currentSnapshot || 2) + "/0/1/")}>Explorer</NavLink>
            </NavItem>
            <NavItem>
                <NavLink tag={Link} to={path(props.match, "types-frames")}>Type & Frame Lists</NavLink>
            </NavItem>
        </Nav>

        <Switch>
            <Route path={props.match.url + "/collectables/:snapshotIndex/:leftIndex/:rightIndex"} render={({location, match}) => {
                function switchSnapshotWithUrlChange(target) {
                    props.onSwitchSnapshot(target);
                    history.push(props.match.url + "/collectables/" + target + "/" + match.params.leftIndex + "/" + match.params.rightIndex);
                }
                return (
                <Container><Row><SnapshotList
                    modelState={props.heapanalyzer.modelState}
                    loadedSnapshots={props.heapanalyzer.loadedSnapshots}
                    currentSnapshot={props.heapanalyzer.currentSnapshot}
                    operations={props.heapanalyzer.runningOperations}
                    summaries={props.heapanalyzer.summaries}
                    highscores={props.heapanalyzer.highscores}

                    onRequestSnapshot={props.onRequestSnapshot}
                    onSwitchSnapshot={switchSnapshotWithUrlChange}

                    match={props.match}
                />
                </Row>
                <Row>
                    <h1>Explorer</h1>
                    <CollectableNavigator heapanalyzer={props.heapanalyzer}
                                      onSwitchSnapshot={props.onSwitchSnapshot}
                                      match={match}/>
                </Row>
                </Container>);
                }} />

            <Route path={props.match.url + "/network-view/:snapshotIndex/:startingIndex"} render={({location, match}) => {
                return <NetworkView
                    modelData={props.heapanalyzer.modelData}
                    snapshotIndex={match.params.snapshotIndex}
                    startingPoint={match.params.startingIndex}
                    match={match}/>
            }} />

            <Route path={props.match.url + "/types-frames"} render={({location, match}) => {
                return [
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
                />,
                <div>
                    <TypeFrameListing
                        currentSnapshot={props.heapanalyzer.currentSnapshot}
                        modelData={props.heapanalyzer.modelData}
                        onRequestModelData={props.onRequestModelData}

                        highscores={props.heapanalyzer.highscores}

                        match={match}
                    />
                </div>]}} />

            <Route path={props.match.url + "/find-collectables/:kind/:condition/:target"} render={({location, match}) => (
                [<SnapshotList
                    modelState={props.heapanalyzer.modelState}
                    loadedSnapshots={props.heapanalyzer.loadedSnapshots}
                    currentSnapshot={props.heapanalyzer.currentSnapshot}
                    operations={props.heapanalyzer.runningOperations}
                    summaries={props.heapanalyzer.summaries}
                    highscores={props.heapanalyzer.highscores}

                    onRequestSnapshot={props.onRequestSnapshot}
                    onSwitchSnapshot={props.onSwitchSnapshot}

                    match={props.match}
                />,
                <div>
                    <ObjectFinder
                        currentSnapshot={props.heapanalyzer.currentSnapshot}
                        modelData={props.heapanalyzer.modelData}
                        onRequestModelData={props.onRequestModelData}

                        match={match}
                    />
                </div>])} />

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