import React, {Component} from 'react';
import { Container, Button, Nav, NavItem, NavLink } from 'reactstrap';
import classnames from 'classnames';

import RoutineList from "./RoutineList";
import RoutinePaths from "./RoutinePaths";

export function numberFormatter(number, fractionDigits = 0, thousandSeperator = ',', fractionSeperator = '.') {
    if (number!==0 && !number || !Number.isFinite(number)) return number
    const frDigits = Number.isFinite(fractionDigits)? Math.min(Math.max(fractionDigits, 0), 7) : 0
    const num = number.toFixed(frDigits).toString()

    const parts = num.split('.')
    let digits = parts[0].split('').reverse()
    let sign = ''
    if (num < 0) {sign = digits.pop()}
    let final = []
    let pos = 0

    while (digits.length > 1) {
        final.push(digits.shift())
        pos++
        if (pos % 3 === 0) {final.push(thousandSeperator)}
    }
    final.push(digits.shift())
    return `${sign}${final.reverse().join('')}${frDigits > 0 ? fractionSeperator : ''}${frDigits > 0 && parts[1] ? parts[1] : ''}`
}

export function timeToHuman(time, suffix = 'ms', smaller) {
    if (time / 1000 >= 0.01 || typeof smaller === "undefined") {
        return (<span>{numberFormatter(time / 1000, 2)}
            <small>{suffix}</small></span>);
    }
    else {
        return (<span><u>{numberFormatter(time, 2)}
            <small>{smaller}</small></u></span>);
    }
}

export default class Routine extends Component<{ routine: *, metadata: *, columns: *, expanded: *, allRoutineChildren: *, onExpandButtonClicked: *, maxTime: *, parentEntries: * }> {
    constructor(props) {
        super(props);
        this.state = {
            tab: "callees",
        }
    }

    render() {
        let {routine, metadata, columns, expanded, allRoutineChildren, onExpandButtonClicked, maxTime, parentEntries} = this.props;
        if (typeof columns === "string") {
            columns = columns.split(" ");
        }
        const myMetadata = metadata[routine.id];
        let columnFunctions = {
            expand() {
                return (<td key={"expand"}>
                    <Button onClick={() => onExpandButtonClicked(routine.id)}>
                        <i className="fas fa-folder-open"/>
                    </Button></td>
                )
            },
            sitecount() {
                return (<td key={"sitecount"}>{routine.sitecount}</td>)
            },
            nameInfo() {
                return (<td key={"nameInfo"}>
                    <span className="routineName"><strong>{myMetadata.name}</strong></span><br/>
                    <span className="routineFileInfo">{myMetadata.file}:{myMetadata.line}</span>
                </td>)
            },
            entriesInfo() {
                const jitText = (routine.jit_entries * 100 / routine.entries).toPrecision(3)
                return (<td key={"entriesInfo"}>
                    <div style={{float: "right"}}>
                        <small>
                            {
                                jitText !== "0.00" ? jitText : "0"
                            }% jit
                        </small>
                    </div>
                    <span>{numberFormatter(routine.entries)}</span>
                    {
                        typeof parentEntries !== "undefined"
                            ? <React.Fragment><br/>
                                <small>{numberFormatter(routine.entries / parentEntries, 2)} per entry</small>
                            </React.Fragment>
                            : null
                    }
                </td>)
            },
            exclusiveInclusiveTime() {
                var barWidthFirst, barWidthSecond, barWidthRest;
                let willShowBar = typeof maxTime !== "undefined" && routine.exclusive_time <= routine.inclusive_time;
                if (typeof maxTime !== "undefined") {
                    barWidthFirst = (routine.exclusive_time / maxTime) * 100;
                    barWidthSecond = ((routine.inclusive_time - routine.exclusive_time) / maxTime) * 100;
                    barWidthRest = (1 - routine.inclusive_time / maxTime) * 100;
                }
                const barStyle = {
                    height: "0.4em",
                    padding: "0px",
                    margin: "0px",
                    display: "inline-block"
                }
                return (
                    <td key={"exclusiveInclusiveTime"}>
                        {timeToHuman(routine.exclusive_time, "ms", "µs")} / {timeToHuman(routine.inclusive_time, "ms", "µs")}<br/>
                        {
                            routine.entries > 1 &&
                            <small>
                                {timeToHuman(routine.exclusive_time / routine.entries, "ms", "µs")} / {" "}
                                {timeToHuman(routine.inclusive_time / routine.entries, "ms", "µs")}
                                {" "}per entry
                            </small>
                        }
                        {
                            willShowBar && (
                                <React.Fragment>
                                    <br/>
                                    <div style={{
                                        position: "relative",
                                        width: "100%",
                                        bottom: "-0.3em",
                                        borderBottom: "1px solid grey"
                                    }}>
                                        <span style={{
                                            width: barWidthFirst + "%",
                                            background: "darkblue", ...barStyle
                                        }}/>
                                        <span style={{
                                            width: barWidthSecond + "%",
                                            background: "blue", ...barStyle
                                        }}/>
                                        <span style={{
                                            width: barWidthRest + "%",
                                            background: "lightgrey", ...barStyle
                                        }}/>
                                    </div>
                                </React.Fragment>

                            )
                        }
                    </td>)
            },
            inlineInfo() {
                const inlineText = (routine.inlined_entries * 100 / routine.entries).toPrecision(3)
                return (
                    inlineText === "0.00"
                        ? <td key={"inlineInfo"}>-</td>
                        : <td key={"inlineInfo"}>{inlineText}% inlined</td>
                )
            }
        };
        let expandedComponent = <React.Fragment/>;
        if (expanded) {
            if (this.state.tab === "callees") {
                expandedComponent = (<Container>
                    {
                        (!allRoutineChildren || typeof allRoutineChildren[routine.id] === "undefined")
                        && <span>Loading, hold on ...</span>
                    }
                    {
                        (allRoutineChildren && allRoutineChildren[routine.id])
                        && <RoutineList routines={allRoutineChildren[routine.id]}
                                        metadata={metadata}
                                        columns={"sitecount nameInfo entriesInfo inlineInfo exclusiveInclusiveTime"}
                                        maxTime={routine.inclusive_time}
                                        parentEntries={routine.entries}
                                        headerComponent={null}
                        />
                    }
                </Container>);
            }
            else if (this.state.tab === "paths") {
                expandedComponent = (<Container>
                        <RoutinePaths routineId={routine.id} allRoutines={metadata}/>
                    </Container>);
            }
        }
        return [
            <tr key={routine.id + "_entry"}>
                {
                    columns.map((name) => columnFunctions[name]())
                }
            </tr>,
            expanded &&
            <tr key={routine.id + "expanded"}>
                <td colSpan={columns.length}>
                    <Nav tabs>
                        <NavItem>
                            <NavLink className={classnames({active: this.state.tab === "callees"})} onClick={() => this.setState(state => state.tab = "callees")}>Callees</NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink className={classnames({active: this.state.tab === "paths"})} onClick={() => this.setState(state => state.tab = "paths")}>Paths</NavLink>
                        </NavItem>
                    </Nav>
                    { expandedComponent }
                </td>
            </tr>
        ];
    }
}
