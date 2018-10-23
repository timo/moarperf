import $ from "jquery";
import React from "react";

import { Progress } from 'reactstrap';

import { ResponsiveContainer, BarChart, Bar, Tooltip, XAxis, YAxis, Label } from 'recharts';
import { numberFormatter, timeToHuman } from "./RoutinePieces";

export default class OverviewPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: {
                overviewData: false
            },
            overviewData: null,
            error: null,
        }
    }

    requestOverviewData() {
        console.log("requesting the overview data");
        this.setState((state) => ({
            isLoading: {
                ...state.isLoading,
                overviewData: true
            }
        }));

        const stateChangeForOverviewData = (self, {threads, gcstats, allgcstats}) => {
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
                    overviewData: {threads, gcstats, timingSpans, allgcstats, totalTime}
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

        const gcpercent = 100 * allgcstats.total / this.state.overviewData.totalTime;

        return (
            <div>
                <div style={{float: "left"}}>
                    <h4>Start times of threads</h4>
                    <BarChart layout="horizontal" data={this.state.overviewData.timingSpans} height={200} width={300}>
                        <Bar dataKey={"first_entry_time"}  fill={"#1c6"} isAnimationActive={false}/>
                        <YAxis />
                        <XAxis dataKey={"thread"} />
                    </BarChart>
                </div>
                <div>
                    This is the overview page. Please excuse the mess, it's only temporary.
                </div>
                <div style={{float: "clear"}}>
                    <h3>Threads</h3>
                    At the end of the program, {this.state.overviewData.threads.length} threads were active.
                </div>
                <div>
                    <h3>GC Performance</h3>
                    <p>GC runs have taken <strong>{ numberFormatter(gcpercent, 2) }%</strong> of total run time</p>
                    <Progress multi>
                        <Progress bar color="warning" value={Math.ceil(gcpercent)} />
                        <Progress bar color="success" value={100 - Math.ceil(gcpercent)} />
                    </Progress>

                    <p>The Garbage Collector ran <strong>{ gcstats.length } times</strong>.
                    {
                        fullGCs && [" ", <strong>{numberFormatter(fullGCs)}</strong>, " GC runs inspected the entire heap."]
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
                        fullGCs == 1 && (<p>The Major GC run took <strong>{ timeToHuman(allgcstats.max_major_time) }</strong></p>)
                    }

                    {
                        anyGCs && (
                            <p>Total time spent in GC was <strong>{timeToHuman(allgcstats.total)}</strong></p>
                        )
                    }
                    {
                        fullGCs > 0 && (
                            <p>Of that, minor collections accounted for <strong>{timeToHuman(allgcstats.total_minor)}</strong> and major collections accounted for <strong>{timeToHuman(allgcstats.total_major)}</strong></p>
                        )
                    }
                </div>
                <div>
                    <h3>Code Specializer Performance</h3>
                </div>
            </div>
        );
    }
}