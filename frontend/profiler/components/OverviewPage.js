import $ from "jquery";
import React from "react";

import {FlameGraph} from 'react-flame-graph';

import { Table, Progress } from 'reactstrap';

import { ResponsiveContainer, BarChart, Bar, Tooltip, XAxis, YAxis, Label } from 'recharts';
import { numberFormatter, timeToHuman } from "./RoutinePieces";

function FrameCountRow(props: { value: number, entries_total: number, frametypename: string, color: string }) {
    return <tr>
        <th style={{width: "25%"}}>
            {props.frametypename} Frames
        </th>
        <td style={{width: "50%"}}>
            <Progress color={props.color} value={props.value} max={props.entries_total}/>
        </td>
        <td style={{width: "25%"}}>
            {numberFormatter(100 * props.value / props.entries_total, 2)}% ({numberFormatter(props.value)})
        </td>
    </tr>;
}

export default class OverviewPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: {
                overviewData: false,
                flameGraph: false,
            },
            overviewData: null,
            flameGraph: null,
            error: null,
        }
    }

    requestOverviewData() {
        console.log("requesting the overview data");
        this.setState((state) => ({
            isLoading: {
                ...state.isLoading,
                overviewData: true,
                flameGraph: true,
            }
        }));

        const stateChangeForOverviewData = (self, {threads, gcstats, allgcstats, callframestats}) => {
            var totalTime = 0;
            const timingSpans = threads.map((thread) => {
                if (thread.first_entry_time + thread.total_time > totalTime)
                    totalTime = thread.first_entry_time + thread.total_time;
                return ({
                    range: [
                        thread.first_entry_time / 1000,
                        (thread.first_entry_time + thread.total_time) / 1000
                    ],
                    first_entry_time: thread.first_entry_time / 1000,
                    thread: thread.thread_id,
                });
            });
            self.setState((state) => (
                {
                    isLoading: {...state.isLoading, overviewData: false},
                    overviewData: {threads, gcstats, timingSpans, allgcstats, totalTime, callframestats}
                }));
        };

        $.ajax({
            url: '/overview-data',
            type: 'GET',
            contentType: 'application/json',
            success: (overview) => stateChangeForOverviewData(this, overview),
            error: (xhr, errorStatus, errorText) => {
                this.setState(state => (
                    {
                        isLoading: {...state.isLoading, overviewData: false},
                        error: errorStatus + errorText
                    }))
            }
        });

        const stateChangeForFlameGraph = (self, flamegraph) => {
            function recurseLookup(node) {
                return ({
                    ...node,
                    name: self.props.allRoutines[node.routine_id].name,
                    children: node.children.map(recurseLookup)
                });
            }
            if (self.props.allRoutines.length === 0) {
                this.onRequestRoutineOverview();
            } else {
                self.setState((state) => (
                    {
                        isLoading: {...state.isLoading, flameGraph: false},
                        flamegraph: recurseLookup(flamegraph)
                    }));
            }
        };

        $.ajax({
            url: '/flamegraph-for/0',
            type: 'GET',
            contentType: 'application/json',
            success: (flamegraph) => stateChangeForFlameGraph(this, flamegraph),
            error: (xhr, errorStatus, errorText) => {
                this.setState(state => (
                    {
                        isLoading: {...state.isLoading, flameGraph: false},
                        error: errorStatus + errorText
                    }))
            }
        });
    }

    componentDidMount() {
        this.requestOverviewData();
    }

    render() {
        console.log("rendering the overview page");
        if (this.state.overviewData === null || this.state.isLoading.overviewData === true) {
            return (
                <div>Hold on...</div>
            )
        }
        if (this.state.error !== null) {
            return (
                <div>Error: {this.state.error}</div>
            )
        }

        const gcstats = this.state.overviewData.gcstats;
        const fullGCs = gcstats.filter(item => item.full).length;
        const anyGCs = gcstats.length > 0;

        const allgcstats = this.state.overviewData.allgcstats;

        const callframestats = this.state.overviewData.callframestats;

        const gcpercent = 100 * allgcstats.total / this.state.overviewData.totalTime;

        const speshcount = callframestats.spesh_entries_total;
        const jitcount = callframestats.jit_entries_total;
        const interpcount = callframestats.entries_total - (jitcount + speshcount);

        let flamegraph_fragment = <React.Fragment></React.Fragment>;

        if (this.state.flamegraph !== null && typeof this.state.flamegraph !== "undefined") {
            flamegraph_fragment = <FlameGraph data={this.state.flamegraph} width={500} height={700}/>
        }

        return (
            <div>
                <div style={{float: "left"}}>
                    <h4>Start times of threads</h4>
                    <BarChart layout="horizontal" data={this.state.overviewData.timingSpans} height={200} width={300}>
                        <Bar dataKey={"first_entry_time"} fill={"#1c6"} isAnimationActive={false}/>
                        <YAxis/>
                        <XAxis dataKey={"thread"}/>
                    </BarChart>
                </div>
                <div style={{float: "clear"}}>
                    <h3>Threads</h3>
                    <p>
                        The profiled code ran for <strong>{ timeToHuman(this.state.overviewData.totalTime) }</strong>
                    </p>
                    <p>
                        At the end of the program, <strong>{this.state.overviewData.threads.length} threads</strong> were active.
                    </p>
                    <p>
                        The dynamic optimizer ("spesh") has been active for <strong>{ timeToHuman(this.state.overviewData.threads[0].spesh_time) }</strong>.
                    </p>
                </div>
                <div>
                    <h3>GC Performance</h3>
                    <p>GC runs have taken <strong>{numberFormatter(gcpercent, 2)}%</strong> of total run time</p>
                    <Progress multi>
                        <Progress bar color="warning" value={Math.ceil(gcpercent)}/>
                        <Progress bar color="success" value={100 - Math.ceil(gcpercent)}/>
                    </Progress>

                    <p>The Garbage Collector ran <strong>{gcstats.length} times</strong>.
                        {
                            fullGCs && [" ",
                                <strong>{numberFormatter(fullGCs)}</strong>, " GC runs inspected the entire heap."]
                            || " There was never a need to go through the entire heap."
                        }</p>

                    {
                        anyGCs && (<p>Minor GC runs took between {" "}
                            <strong>{timeToHuman(allgcstats.min_minor_time)}</strong> {" "}
                            and {" "}
                            <strong>{timeToHuman(allgcstats.max_minor_time)}</strong> {" "}
                            with an average of {" "}
                            <strong>{timeToHuman(allgcstats.avg_minor_time)}</strong></p>)
                    }

                    {
                        fullGCs > 1 && (<p>Major GC runs took between {" "}
                            <strong>{timeToHuman(allgcstats.min_major_time)}</strong> {" "}
                            and {" "}
                            <strong>{timeToHuman(allgcstats.max_major_time)}</strong> {" "}
                            with an average of {" "}
                            <strong>{timeToHuman(allgcstats.avg_major_time)}</strong></p>)
                    }

                    {
                        fullGCs === 1 && (
                            <p>The Major GC run took <strong>{timeToHuman(allgcstats.max_major_time)}</strong></p>)
                    }

                    {
                        anyGCs && (
                            <p>Total time spent in GC was <strong>{timeToHuman(allgcstats.total)}</strong></p>
                        )
                    }
                    {
                        fullGCs > 0 && (
                            <p>Of that, minor collections accounted
                                for <strong>{timeToHuman(allgcstats.total_minor)}</strong> and major collections
                                accounted for <strong>{timeToHuman(allgcstats.total_major)}</strong></p>
                        )
                    }
                </div>
                <div>
                    <h3>Call Frames</h3>
                    <p>In total, <strong>{numberFormatter(callframestats.entries_total)} call frames</strong> were
                        entered and exited by the profiled code.</p>
                    <p>Inlining eliminated the need to
                        allocate <strong>{numberFormatter(callframestats.entries_total - callframestats.inlined_entries_total)} call
                            frames</strong> (that's <strong>{numberFormatter(100 - 100 * callframestats.inlined_entries_total / callframestats.entries_total, 2)}%</strong>).
                    </p>
                    <Table striped bordered>
                        <FrameCountRow color="danger"  frametypename="Interpreted"  value={interpcount} entries_total={callframestats.entries_total}/>
                        <FrameCountRow color="warning" frametypename="Specialized"  value={speshcount} entries_total={callframestats.entries_total}/>
                        <FrameCountRow color="success" frametypename="JIT-Compiled" value={jitcount} entries_total={callframestats.entries_total}/>
                    </Table>
                </div>
                <div>
                    <h3>Dynamic Optimization</h3>
                    <p>
                        Of {numberFormatter(speshcount + jitcount)} specialized or JIT-compiled frames,
                        there were <strong>{numberFormatter(callframestats.deopt_one_total)} deoptimizations</strong>
                        (that's <strong>{numberFormatter(100 * callframestats.deopt_one_total / (speshcount + jitcount), 2)}%</strong> of all optimized frames).
                    </p>
                    <p>
                        There were <strong>{ numberFormatter(callframestats.deopt_all_total) } global deoptimizations</strong> triggered by the profiled code.
                    </p>
                    <p>
                        During profilation, code in hot loops was <strong>on-stack-replaced (OSR'd) { numberFormatter(callframestats.osr_total) } times</strong>.
                    </p>
                </div>
                { flamegraph_fragment }
            </div>
        );
    }
}