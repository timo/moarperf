import React, {Component} from 'react';
import { Container, Button, Nav, NavItem, NavLink } from 'reactstrap';
import { Link } from 'react-router-dom';

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

export function EntriesInfo({routine, parentEntries}) {
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
}

export function ExclusiveInclusiveTime({routine, maxTime}) {
    var barWidthFirst, barWidthSecond, barWidthRest;
    const exclusive = routine.exclusive_time || routine.exclusive;
    const inclusive = routine.inclusive_time || routine.inclusive;
    let willShowBar = typeof maxTime !== "undefined" && exclusive <= inclusive;
    if (typeof maxTime !== "undefined") {
        barWidthFirst = (exclusive / maxTime) * 100;
        barWidthSecond = ((inclusive - exclusive) / maxTime) * 100;
        barWidthRest = (1 - inclusive / maxTime) * 100;
    }
    const barStyle = {
        height: "0.5em",
        padding: "0px",
        margin: "0px",
        display: "inline-block"
    }
    return (
        <td key={"exclusiveInclusiveTime"}>
            {timeToHuman(exclusive, "ms", "µs")} / {timeToHuman(inclusive, "ms", "µs")}<br/>
            {
                routine.entries > 1 &&
                <small>
                    {timeToHuman(exclusive / routine.entries, "ms", "µs")} / {" "}
                    {timeToHuman(inclusive / routine.entries, "ms", "µs")}
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
                            bottom: "-0.4em",
                            borderBottom: "0px"
                        }}>
                            <span style={{
                                width: barWidthFirst + "%",
                                background: "green", ...barStyle
                            }}/>
                            <span style={{
                                width: barWidthSecond + "%",
                                background: "lime", ...barStyle
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
}

export function allocationInfo({routine}) {

}

export function RoutineFileInfo({routine}) {
    var link;
    if (routine.file.startsWith("SETTING::")) {
        link = <a target="_blank" href={"https://github.com/rakudo/rakudo/blob/master/src/core/" + routine.file.replace("SETTING::", "") + ".pm6#L" + routine.line}>
            { routine.file }:{ routine.line }</a>
    }
    else {
        link = <React.Fragment>{routine.file}:{routine.line}</React.Fragment>
    }
    return <span className="routineFileInfo" style={{overflowWrap: "break-word"}}>{ link }</span>
}

export function RoutineNameInfo({routine, searchResults}) {
    return (<td key={"nameInfo"}>
        { typeof searchResults === "number" && searchResults > 0 && <div style={{float: "left", paddingRight: "1em"}}><i className="fas fa-hand-point-right fa-2x"/></div> }
        <span className="routineName"><strong>{routine.name}</strong></span> <Link to={"/prof/routines/" + routine.id}>
        <i className="fas fa-external-link-square-alt"/>
    </Link><br/>
        <small><RoutineFileInfo routine={routine} /></small>
    </td>)
}

export function LinkButton({icon, target}) {
    return (<td key={"link"}>
            <Link to={target}><Button>
                <i className={"fas fa-" + icon}/>
            </Button>
            </Link></td>
    )
}

export function InlineInfo({routine}) {
    const inlineText = (routine.inlined_entries * 100 / routine.entries).toPrecision(3);
    return (
        inlineText === "0.00"
            ? <td style={{width: "10%"}} key={"inlineInfo"}>-</td>
            : <td style={{width: "10%"}} key={"inlineInfo"}>{inlineText}% inlined</td>
    )
}