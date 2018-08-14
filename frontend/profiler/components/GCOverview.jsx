import React from 'react';
import { ResponsiveContainer, BarChart, Bar, Tooltip, XAxis, YAxis, Label } from 'recharts';
import memoize from 'memoize-state';
import {
    Button, Container, Row, Col, Table
} from 'reactstrap';
import ErrorBoundary from 'react-error-boundary';

import { timeToHuman, numberFormatter } from './RoutinePieces';

export function sizeToHuman(time) {
    return (<span>{numberFormatter(time / 1024, 2)}<small>kB</small></span>);
}

const only_major = memoize(stats_per_sequence => stats_per_sequence.filter(entry => entry && entry.full == 1));
const only_minor = memoize(stats_per_sequence => stats_per_sequence.filter(entry => entry && entry.full == 0));
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
const minimumStartTime = memoize(input => input.map(data => data.start_time).reduce((acc, cur) => acc < cur ? acc : cur));
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

const GcTableRow = ({ data, expanded, seq_details, onGCExpandButtonClicked }) => {
    return (
        <React.Fragment>
            <tr key={data.sequence_num}>
                <td><Button size={"sm"} onClick={() => onGCExpandButtonClicked(data.sequence_num)}><i className="fas fa-folder-open"></i></Button></td>
                <td>{data.sequence_num} {data.full ? <i className="fas fa-square-full"></i>
                    : ""}
                    {
                        data.isFirst== 0 && data.sequence_num != 0
                            ? <span>Why?</span>
                            : ""
                    }
                </td>
                <td>{data.participants}</td>
                <td>{timeToHuman(data.earliest_start_time)}</td>
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
                                            <ErrorBoundary>
                                            <BarChart data={makeSpans(ignoreNulls(seq_details[data.sequence_num]))} height={200}>
                                                <Bar dataKey={"range"} fill={"#1c6"} isAnimationActive={false}/>
                                                <XAxis dataKey={"xAxis"} />
                                                <YAxis />
                                            </BarChart>
                                            </ErrorBoundary>
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
    return ignoreNulls(overview.stats_per_sequence).map((data, index) =>
        <GcTableRow key={"gcTableRow_" + index} data={data} expanded={expanded} seq_details={seq_details} onGCExpandButtonClicked={onGCExpandButtonClicked} />
    )
}

export default function GCOverview(props) {
    const totalTime = typeof props.overview.stats_per_sequence === "undefined"
        ? 0
        : Array.from(props.overview.stats_per_sequence).map(d => d.max_time).reduce((a, b) => a + b, 0);
    return (
        <Container>
            <Row>
                <Col>
                    {
                        typeof props.overview === "undefined" || typeof props.overview.stats_per_sequence === "undefined"
                            ? <Button onClick={props.onRequestGCOverview}>Get GC overview</Button>
                            :
                            <React.Fragment>
                                <h2>Time spent per GC run</h2>
                                <ResponsiveContainer width={"100%"} height={100}>
                                    <ErrorBoundary>
                                    <BarChart height={100} data={ignoreNulls(props.overview.stats_per_sequence)} syncId={"gcoverview"}>
                                        <Bar dataKey={"max_time"} fill={"#38f"} isAnimationActive={false}/>
                                        <Tooltip content={<div></div>}/>
                                    </BarChart>
                                    </ErrorBoundary>
                                </ResponsiveContainer>
                                <div>Total Time: { timeToHuman(totalTime) }</div>
                                <h2>Time between GC runs</h2>
                                <ResponsiveContainer width={"100%"} height={100}>
                                    <ErrorBoundary>
                                    <BarChart height={100} data={time_diffs(props.overview.stats_per_sequence)} syncId={"gcoverview"}>
                                        <Bar dataKey={"time_since_prev"} fill={"#f83"} isAnimationActive={false}/>
                                        <Tooltip content={(stuff) => {
                                            const outer = stuff.payload;
                                            if (typeof outer !== "undefined" && outer.length > 0) {
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
                                    </ErrorBoundary>
                                </ResponsiveContainer>
                            </React.Fragment>
                    }
                </Col>
            </Row>
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
