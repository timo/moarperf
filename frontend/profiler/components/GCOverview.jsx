import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, Tooltip, XAxis, YAxis, Label } from 'recharts';
//import memoize from 'memoize-state';
import {
    Button, Container, Row, Col, Table
} from 'reactstrap';
import ErrorBoundary from 'react-error-boundary';

import { timeToHuman, numberFormatter } from './RoutinePieces';
import {Bytes} from "./AllocationViewer";

const memoize = a => a;

export function sizeToHuman(time) {
    return (<span>{numberFormatter(time / 1024, 2)}<small>kB</small></span>);
}

const only_major = memoize(stats_per_sequence => stats_per_sequence.filter(entry => entry && entry.full === 1));
const only_minor = memoize(stats_per_sequence => stats_per_sequence.filter(entry => entry && entry.full === 0));
const time_diffs = memoize(stats_per_sequence => {
    let result = [];
    let previous = {latest_end_time: 0};
    for (const entry of stats_per_sequence) {
        if (entry == null) {
            continue;
        }
        if (previous == null) {
            previous = entry;
        }
        else {
            result.push(
                {
                    sequence_num: entry.sequence_num,
                    time_since_prev: entry.earliest_start_time - previous.latest_end_time,
                    earliest_start_time: entry.earliest_start_time,
                    max_time: entry.max_time,
                });
            previous = entry;
        }
    }
    return result;
});
const ignoreNulls = memoize(input => input.filter(a => a !== null));
const minimumStartTime = memoize(input => input.map(data => data.start_time).reduce((acc, cur) => acc < cur ? acc : cur, Infinity));
const makeSpans = input => {
        const minStartTime = minimumStartTime(input);
        console.log(input);
        return input.map(
            a => {
                console.log(a);
                return (
                    {
                        sequence_num: a.sequence_num,
                        thread_id: a.thread_id,
                        range: [(a.start_time - minStartTime) / 1000,
                            (a.start_time + a.time - minStartTime) / 1000],
                        xAxis: a.thread_id + (a.responsible ? " *" : "")
                    });
            });
    };
const relativize = memoize(input => input.map(line => {
        const total = line.retained_bytes + line.promoted_bytes + line.cleared_bytes;
        return {
            ...line,
            rel_retained_bytes: line.retained_bytes / total,
            rel_promoted_bytes: line.promoted_bytes / total,
            rel_cleared_bytes:  line.cleared_bytes  / total,
        }
    }));

const GcTableRow = ({ data, expanded, seq_details, prevData, onGCExpandButtonClicked }) => {
    return (
        <React.Fragment>
            <tr key={data.sequence_num}>
                <td><Button size={"sm"} onClick={() => onGCExpandButtonClicked(data.sequence_num)}><i className="fas fa-folder-open"></i></Button></td>
                <td>{data.sequence_num} {data.full ? <i className="fas fa-square-full"></i>
                    : ""}
                    {
                        /*data.isFirst === 0 && data.sequence_num !== 0
                            ? <span>Why?</span>
                            : ""*/
                    }
                </td>
                <td>{data.participants}</td>
                <td>{timeToHuman(data.earliest_start_time)}
                    {
                        typeof prevData === "undefined"
                            ? null
                            : <React.Fragment>{" "}
                                <small>{timeToHuman(data.earliest_start_time - prevData.earliest_start_time - prevData.max_time)} after prev</small>
                            </React.Fragment>
                    }
                </td>
                <td>{timeToHuman(data.max_time, "ms spent")}</td>
            </tr>
            {
                expanded[data.sequence_num] && seq_details && seq_details[data.sequence_num] ?
                    <tr>
                        <td colSpan={5}>
                            <Container>
                                <Row>
                                    <Col xs={4}>
                                        <ResponsiveContainer width={"100%"} height={200}>
                                            <BarChart data={makeSpans(ignoreNulls(seq_details[data.sequence_num]))} height={200}>
                                                <Bar dataKey={"range"} fill={"#1c6"} isAnimationActive={false}/>
                                                <XAxis dataKey={"xAxis"} />
                                                <YAxis />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Col>
                                    <Col xs={8}>
                                        <Table striped>
                                            <thead>
                                            <tr>
                                                <th>Thread</th>
                                                <th>Amounts</th>
                                                <th>Inter-Gen Roots</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {
                                                ignoreNulls(seq_details[data.sequence_num]).map(data =>
                                                    <tr key={data.thread_id}>
                                                        <td>
                                                            { data.thread_id }
                                                        </td>
                                                        <td>
                                                            { sizeToHuman(data.retained_bytes) } { sizeToHuman(data.promoted_bytes) } { sizeToHuman(data.cleared_bytes) }
                                                        </td>
                                                        <td>
                                                            { data.gen2_roots }
                                                        </td>
                                                    </tr>
                                                )
                                            }
                                            </tbody>
                                        </Table>
                                    </Col>
                                </Row>
                            </Container>
                        </td>
                    </tr>
                    : null
            }
        </React.Fragment>
    );
}

const GcTable = ({ overview, expanded, seq_details, onGCExpandButtonClicked }) => {
    if (typeof overview === "undefined" || typeof overview.stats_per_sequence === "undefined")
        return (<tr key={0}>
            <td colSpan={5}>nothing</td>
        </tr>);
    if (overview.stats_per_sequence.length === 0) {
        return (<tr><td colSpan={5} key={0}>There were no GC runs during the recording.</td></tr>);
    }
    let seen = -1;
    const rowInputData = ignoreNulls(overview.stats_per_sequence);
    return rowInputData.map((data, index) =>
        <GcTableRow key={"gcTableRow_" + index} data={data} prevData={index > 0 ? rowInputData[index - 1] : undefined} expanded={expanded} seq_details={seq_details} onGCExpandButtonClicked={onGCExpandButtonClicked} />
    )
}

export default function GCOverview(props) {
    const totalTime = typeof props.overview.stats_per_sequence === "undefined"
        ? 0
        : Array.from(props.overview.stats_per_sequence).filter(d => d !== null).map(d => d.max_time).reduce((a, b) => a + b, 0);
    if (typeof props.overview.stats_per_sequence !== "undefined") {
        ignoreNulls(props.overview.stats_per_sequence).forEach((d) => console.log(d.cleared_bytes + d.promoted_bytes + d.retained_bytes));
    }
    // 0 == hide major, 1 == show all, 2 == only major
    const [filterMode, setFilterMode] = useState(1);
    const [isLoading, setIsLoading]   = useState(false);

    // 0 == split bars, 1 == stacked bars absolute, 2 == stacked bars relative (every row is 100% tall)
    const [stackedBarMode, setStackedBarMode] = useState(2);

    useEffect(() => {
        if (!isLoading && typeof props.overview === "undefined" || typeof props.overview.stats_per_sequence === "undefined") {
            props.onRequestGCOverview();
            setIsLoading(true);
        }
        else if (isLoading && !(typeof props.overview === "undefined" || typeof props.overview.stats_per_sequence === "undefined")) {
            setIsLoading(false);
        }
    }, [props.overview, props.overview.stats_per_sequence]);

    if (isLoading) {
        return (<Container>
            <Row>
                <Col>
                    Loading, please wait ...
                </Col>
            </Row>
        </Container>)
    }
    if (typeof props.overview === "undefined" || typeof props.overview.stats_per_sequence === "undefined") {
        return (<Container>
            <Row>
                <Col>
                    <Button onClick={props.onRequestGCOverview}>Get GC overview</Button>
                </Col>
            </Row>
        </Container>)
    }
    const sourceOfData = relativize(ignoreNulls(props.overview.stats_per_sequence));
    const dataToUse = filterMode === 0
                ? only_minor(sourceOfData)
                : filterMode === 2
                    ? only_major(sourceOfData)
                    : sourceOfData;



    const colorForDataKey = {
        promoted_bytes: "#f32",
        retained_bytes: "#fa5",
        cleared_bytes:  "#3f3",

        rel_promoted_bytes: "#f32",
        rel_retained_bytes: "#fa5",
        rel_cleared_bytes:  "#3f3",
    };

    const tooltipTextForDataKey = {
        promoted_bytes: "Promoted",
        retained_bytes: "Retained",
        cleared_bytes:  "Cleared",
        rel_promoted_bytes: "Promoted",
        rel_retained_bytes: "Retained",
        rel_cleared_bytes:  "Cleared",
    };

    const memoryAmountSource =
        [
            [
                {title: "Promoted to the old generation", dataKeys: ["promoted_bytes"]},
                {title: "Retained for another GC run", dataKeys: ["retained_bytes"]},
                {title: "Cleared from the nursery", dataKeys: ["cleared_bytes"]},
            ],
            [{title: "Promoted, Kept, Freed", dataKeys: ["promoted_bytes", "retained_bytes", "cleared_bytes"]}],
            [{title: "Percentages Promoted, Kept, Freed", dataKeys: ["rel_promoted_bytes", "rel_retained_bytes", "rel_cleared_bytes"]}],
        ][stackedBarMode];

    return (
        <Container>
            <Row><Col>
                <Button onClick={() => setFilterMode(0)} size={"sm"} disabled={filterMode === 0}>Only Minor Collections</Button>
                <Button onClick={() => setFilterMode(1)} size={"sm"} disabled={filterMode === 1}>Everything</Button>
                <Button onClick={() => setFilterMode(2)} size={"sm"} disabled={filterMode === 2}>Only Major Collections</Button>
                <h2>Time spent per GC run</h2>
                <ResponsiveContainer width={"100%"} height={100}>
                    <BarChart height={100} data={dataToUse} syncId={"gcoverview"}>
                        <Bar dataKey={"max_time"} fill={"#38f"} isAnimationActive={false}/>
                        <Tooltip content={<div></div>}/>
                    </BarChart>
                </ResponsiveContainer>
                <div>Total Time: { timeToHuman(totalTime) }</div>
                <h2>Time between GC runs</h2>
                <ResponsiveContainer width={"100%"} height={100}>
                    <BarChart height={100} data={time_diffs(dataToUse)} syncId={"gcoverview"}>
                        <Bar dataKey={"time_since_prev"} fill={"#f83"} isAnimationActive={false}/>
                        <Tooltip content={(stuff) => {
                            const outer = stuff.payload;
                            if (typeof outer !== "undefined" && outer !== null && outer.length > 0) {
                                const payload = outer[0].payload;
                                return (
                                    <div style={{background: "#aaa"}}>
                                        {payload.sequence_num}:<br/>
                                        {timeToHuman(payload.earliest_start_time, "ms since start")}<br/>
                                        {timeToHuman(payload.time_since_prev, "ms since previous run")}<br/>
                                        {timeToHuman(payload.max_time, "ms time spent")}<br/>
                                    </div>);
                            }
                        }
                        } />
                    </BarChart>
                </ResponsiveContainer>
                <h2>Amounts of Data</h2>
                <Button onClick={() => setStackedBarMode(0)} size={"sm"} disabled={stackedBarMode === 0}>Split Charts</Button>
                <Button onClick={() => setStackedBarMode(1)} size={"sm"} disabled={stackedBarMode === 1}>Combined Chart</Button>
                <Button onClick={() => setStackedBarMode(2)} size={"sm"} disabled={stackedBarMode === 2}>Combined Relative Amounts</Button>
                {
                    memoryAmountSource.map(({title, dataKeys}) => (
                        <React.Fragment>
                        <h3>{ title }</h3>
                        <ResponsiveContainer width={"100%"} height={100}>
                            <BarChart height={100} data={dataToUse} syncId={"gcoverview"}>
                                {
                                    stackedBarMode !== 2 && <YAxis tickFormatter={num => numberFormatter(num / 1024)}/>
                                }
                                {
                                    dataKeys.map(key => (
                                        <Bar dataKey={key} fill={colorForDataKey[key]} stackId={"nursery_bytes"} isAnimationActive={false}/>
                                    ))
                                }
                                <Tooltip content={(stuff) => {
                                    const outer = stuff.payload;
                                    if (typeof outer !== "undefined" && outer !== null && outer.length > 0) {
                                        const payload = outer[0].payload;
                                        return (
                                            <div style={{background: "#aaa"}}>
                                                {payload.sequence_num}:<br/>
                                                {
                                                    stackedBarMode === 2
                                                        ?
                                                            dataKeys.map(key => (
                                                                <React.Fragment>{tooltipTextForDataKey[key]}: {numberFormatter(payload[key] * 100, 2)}<small>%</small><br/></React.Fragment>
                                                            ))
                                                        :
                                                            dataKeys.map(key => (
                                                                <React.Fragment><Bytes kilo size={payload[key]}/> <small>{tooltipTextForDataKey[key]}</small><br/></React.Fragment>
                                                            ))
                                                }
                                            </div>);
                                    }
                                }
                                } />

                            </BarChart>
                        </ResponsiveContainer>
                        </React.Fragment>
                    ))
                }
            </Col></Row>
            <Table striped>
                <thead>
                <tr>
                    <th></th>
                    <th>GC Run</th>
                    <th>threads</th>
                    <th>Start Time</th>
                    <th>Timing</th>
                </tr>
                </thead>
                <tbody>
                    <ErrorBoundary>
                    <GcTable
                        overview={props.overview}
                        expanded={props.expanded}
                        seq_details={props.seq_details}
                        onGCExpandButtonClicked={props.onGCExpandButtonClicked}
                    />
                    </ErrorBoundary>
                </tbody>
            </Table>
            <Table striped>
                <thead>
                <tr>
                <th></th>
                </tr>
                </thead>
            </Table>
        </Container>
    )
}
