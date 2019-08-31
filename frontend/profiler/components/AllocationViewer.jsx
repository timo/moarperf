import React, {Component, useState} from 'react';
import {Container, Row, Table, Button} from 'reactstrap';
import $ from 'jquery';
import { ResponsiveContainer, BarChart, Bar, Tooltip, XAxis, YAxis } from 'recharts';

import {EntriesInfo, LinkButton, numberFormatter, RoutineNameInfo} from './RoutinePieces';
import {AllocNameAndRepr} from "./AllocationParts";
import RoutinePaths from "./RoutinePaths";

const memoize = a => a;

export function Bytes ({ size, totalCount, extraData, kilo }) {
    if (kilo) {
        size = size / 1024;
    }
    return <React.Fragment>
        <span>{numberFormatter(size)} <small>{kilo && "kilo"}bytes {extraData && <span><small>+ x</small></span> || null}</small></span>
        {
            totalCount > 0 &&
            <React.Fragment>
                <br/>
                <small>
                <span>{numberFormatter(size * totalCount)} <small>{kilo && "kilo"}bytes total</small></span>
                </small>
            </React.Fragment>
            || null
        }
    </React.Fragment>
}

function AllocatingRoutineRow(props: { routine: T, allRoutines: any, metadata: any }) {
    const [isExpanded, setIsExpanded] = useState(false);

    console.log(props);

    console.log(props.routine.callsites);

    const expandedParts =
        !isExpanded
            ? <React.Fragment/>
            : <tr><td colSpan={6}><Container>
                <RoutinePaths callIdList={props.routine.callsites} allRoutines={props.metadata}/>
            </Container></td></tr>

    return <React.Fragment><tr>
        <td>
            <Button onClick={() => setIsExpanded(!isExpanded)}>
                <i className="fas fa-sitemap"/>
            </Button>
        </td>
        <td>{props.routine.sitecount}</td>
        <RoutineNameInfo routine={props.metadata[props.routine.id]}/>
        <EntriesInfo routine={props.routine}/>
        <td>
            <Bytes extraData={props.routine.alloc.has_unmanaged_data} size={props.routine.alloc.managed_size}
                   totalCount={props.routine.allocs}/>
        </td>
        <td>{numberFormatter(props.routine.allocs)}</td>
        <td>{numberFormatter(props.routine.replaced)}</td>
    </tr>
        { expandedParts }
    </React.Fragment>
}

export function AllocRoutineList(props) {
    // const HeaderComponent = this.props.HeaderComponent;

    const routines = props.routines;
    const metadata = props.metadata;

    return (
        <div>
            { /*<HeaderComponent /> */ }
            <Table striped>
                <thead>
                    <tr>
                        <th></th>
                        <th>Sites</th>
                        <th>Name</th>
                        <th>Entries</th>
                        <th>Size</th>
                        <th>Count</th>
                        <th>Optimized Out</th>
                    </tr>
                </thead>
                <tbody>
                {
                    routines.map((routine) => (
                        <AllocatingRoutineRow key={routine.id} routine={routine} metadata={metadata}/>
                    ))
                }
                </tbody>
            </Table>
        </div>
    );
}

const ignoreNulls = memoize(input => input.filter(a => a !== null));

const trimNulls = memoize(input => {
    let soakedUp = [];
    let output = [];
    for (let key in input) {
        let value = input[key];
        if (value === null) {
            if (output.length != 0)
                soakedUp.push({ sequence: key, fresh: 0, seen: 0, gen2: 0 })
        }
        else {
            output.push(...soakedUp);
            output.push(value);
            soakedUp = [];
        }
    }
    return output;
});

const sumUp = memoize(input => input.map(entry => ({ xAxis: entry.sequence, fresh: entry.fresh, seen: entry.seen, gen2: entry.gen2 })));

export class AllocationType extends Component<{ onClick: () => any, alloc: any }> {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: {
                allocatingRoutines: false,
                deallocationHistory: false,
            },
            loadErrors: {
                allocatingRoutines: null,
                deallocationHistory: null,
            },
            isExpanded: false,
            allocatingRoutines: null,
            deallocationHistory: null,
        }
    }

    handleExpandClick = () => {
        console.log("handle expand called");
        if (this.state.isExpanded) {
            this.setState((state) => ({
                isExpanded: !state.isExpanded,
                isHistoryExpanded: false,
            }));
        }
        else if (!this.state.isLoading.allocatingRoutines && (this.state.allocatingRoutines === null || this.state.loadErrors.allocatingRoutines !== null)) {
            this.setState((state) => ({
                isLoading: { ...state.isLoading, allocatingRoutines: true },
                loadErrors: { ...state.loadErrors, allocatingRoutines: null },
                isExpanded: true,
            }));

            const stateChangeForRoutines = (it, result, alloc) => {
                console.log("changing state for received results");
                it.setState((state) => ({
                    isLoading: { ...state.isLoading, allocatingRoutines: false },
                    loadErrors: { ...state.loadErrors, allocatingRoutines: null },
                    allocatingRoutines: result.map((routine) => (
                        {
                            ...routine,
                            alloc,
                            callsites: routine.callsites.split(",").map((a) => parseInt(a))
                        })),
                }))
            };

            $.ajax({
                url: '/allocating-routines-per-type/' + this.props.alloc.id,
                type: 'GET',
                contentType: 'application/json',
                success: (routines) => stateChangeForRoutines(this, routines, this.props.alloc),
                error: (xhr, errorStatus, errorText) => {
                    this.setState(state => ({
                        isLoading: { ...this.state.isLoading, allocatingRoutines: false },
                        loadErrors: {
                            ...state.loadErrors,
                            allocatingRoutines:
                                state.loadErrors.allocatingRoutines
                                + errorStatus
                                + errorText}
                    }))}
            })

            this.setState((state) => ({isLoading: {...state.isLoading, allocatingRoutines: true}}));
        }
        else if (!this.state.isExpanded) {
            this.setState((state) => ({
                isExpanded: true
            }))
        }
    }

    handleExpandHistoryClick = () => {
        console.log("handle expand history called");
        if (this.state.isHistoryExpanded) {
            this.setState((state) => ({
                isHistoryExpanded: !state.isHistoryExpanded,
                isExpanded: false,
            }));
        }
        else if (!this.state.isLoading.deallocationHistory && (this.state.deallocationHistory === null || this.state.loadErrors.deallocationHistory !== null)) {
            this.setState((state) => ({
                isLoading: { ...state.isLoading, deallocationHistory: true },
                loadErrors: { ...state.loadErrors, deallocationHistory: null },
                isExpanded: false,
                isHistoryExpanded: true,
            }));

            const stateChangeForDeallocations = (it, result, alloc) => {
                console.log("changing state for received results");
                it.setState((state) => ({
                    isLoading: { ...state.isLoading, deallocationHistory: false },
                    loadErrors: { ...state.loadErrors, deallocationHistory: null },
                    deallocationHistory: result
                }))
            };

            $.ajax({
                url: '/deallocations-for-type/' + this.props.alloc.id,
                type: 'GET',
                contentType: 'application/json',
                success: (routines) => stateChangeForDeallocations(this, routines, this.props.alloc),
                error: (xhr, errorStatus, errorText) => {
                    this.setState(state => ({
                        isLoading: { ...state.isLoading, allocatingRoutines: false },
                        loadErrors: {
                            ...state.loadErrors,
                            allocatingRoutines:
                                state.loadErrors.allocatingRoutines
                                + errorStatus
                                + errorText}
                    }))}
            })

            this.setState((state) => ({isLoading: {...state.isLoading, allocatingRoutines: true}}));
        }
        else if (!this.state.isHistoryExpanded) {
            this.setState((state) => ({
                isHistoryExpanded: true
            }))
        }
    }

    render() {
        let {
            isExpanded,
            isHistoryExpanded,
            isLoading,
            loadErrors,
            allocatingRoutines,
            deallocationHistory,
        } = this.state;

        var expandComponent = <React.Fragment></React.Fragment>;

        if (isExpanded) {
            var expandContent = null;
            if (loadErrors.allocatingRoutines === null) {
                if (isLoading.allocatingRoutines) {
                    expandContent = <div><span>Loading, please wait...</span></div>
                }
                else {
                    expandContent = <React.Fragment>
                            <AllocRoutineList routines={ allocatingRoutines }
                                         metadata={ this.props.metadata }
                                         allRoutineChildren={ this.props.allRoutineChildren }

                                         HeaderComponent={ (props) => <h3>Routines allocating { this.props.alloc.name }</h3> }

                                         // columns={"expand sitecount nameInfo "}
                            />
                    </React.Fragment>
                }
            }
            if (expandContent !== null)
                expandComponent =
                    <React.Fragment>
                        <tr>
                            <td colSpan={5}>
                                { expandContent }
                            </td>
                        </tr>
                    </React.Fragment>;
        }
        else if (isHistoryExpanded) {
            var expandContent = null;
            if (loadErrors.deallocationHistory === null) {
                if (isLoading.deallocationHistory) {
                    expandContent = <div><span>Loading, please wait...</span></div>
                }
                else {
                    expandContent = <React.Fragment>
                        <h2>{this.props.alloc.name} freed in each GC run</h2>
                        <ResponsiveContainer width={"100%"} height={200}>
                            <BarChart data={sumUp(trimNulls(deallocationHistory))} height={300}>
                                <Bar dataKey={"fresh"} fill={"#3f3"} stackId={"deallocs"} isAnimationActive={false}/>
                                <Bar dataKey={"seen"} fill={"#fa5"} stackId={"deallocs"} isAnimationActive={false}/>
                                <Bar dataKey={"gen2"} fill={"#f32"} stackId={"deallocs"} isAnimationActive={false}/>
                                <XAxis dataKey={"xAxis"}/>
                                <YAxis/>
                            </BarChart>
                        </ResponsiveContainer>
                    </React.Fragment>
                }
            }
            if (expandContent !== null)
                expandComponent =
                    <React.Fragment>
                        <tr>
                            <td colSpan={5}>
                                { expandContent }
                            </td>
                        </tr>
                    </React.Fragment>;

        }

        console.log(this.props.alloc);

        return (
            <React.Fragment>
                <tr>
                    <td style={{whiteSpace: "nowrap"}}>
                        <Button onClick={this.handleExpandClick}>
                            <i className="fas fa-folder-open"/>
                        </Button>{" "}
                        <Button onClick={this.handleExpandHistoryClick}>
                            <i className="fas fa-chart-line"/>
                        </Button>{" "}
                        <Button onClick={this.props.onClick}>
                            <i className="fab fa-readme"/>
                        </Button>
                    </td>
                    <AllocNameAndRepr alloc={this.props.alloc}/>
                    <td>
                        <Bytes extraData={this.props.alloc.has_unmanaged_data} size={this.props.alloc.managed_size}
                               totalCount={this.props.alloc.count}/>
                    </td>
                    <td>{numberFormatter(this.props.alloc.count)}</td>
                    <td>{numberFormatter(this.props.alloc.replaced)}</td>
                </tr>
                {
                    expandComponent
                }
            </React.Fragment>);
    }
}

export default class AllocationTypeList extends Component {
    static defaultProps = {
        typeId: null
    };

    constructor(props) {
        super(props);
        this.state = {
            isLoading: {
                allAllocations: false,
            },
            loadError: {
                allAllocations: null,
            },
            allAllocations: [],
        }
    }

    requestAllAllocations() {
        this.setState((state) => ({
            isLoading: {
                allAllocations: true
            }
        }));

        const stateChangeForAllAllocs = (self, allocs) => {
            self.setState((state) => ({
                allAllocations: allocs,
                isLoading: { allAllocations: false },
                loadError: { allAllocations: null },
            }))
        };

        $.ajax({
            url: '/all-allocations',
            type: 'GET',
            contentType: 'application/json',
            success: (allocs) => stateChangeForAllAllocs(this, allocs),
            error: (xhr, errorStatus, errorText) => {
                this.setState(state => ({
                    isLoading: { incAllocs: false },
                    loadError: {
                        allAllocations:
                            state.loadError.allAllocations
                                + errorStatus
                                + errorText}
                }))}
        })
    }

    componentDidMount() {
        this.requestAllAllocations();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.id !== this.props.callId) {
            this.requestAllAllocations();
        }
    }

    render() {
        let {
            isLoading: {
                allAllocations: allAllocationsLoading,
            },
            loadError: {
                allAllocations: allAllocationsError,
            },
            allAllocations
        } = this.state;

        if (allAllocationsLoading) {
            return (<Container><div>Hold on...</div></Container>)
        }

        if (allAllocationsError !== null) {
            return (<Container>
                <div>
                    Error: { allAllocationsError }
                </div>
            </Container>)
        }

        return (
            <Container>
                <Row>
                    <h2>All types allocated by this program</h2>
                </Row>
                <Row>
                    <Table striped>
                        <thead>
                        <tr>
                            <th style={{width: "1%"}}></th>
                            <th>Name<br/><small>REPR</small></th>
                            <th>Type Properties</th>
                            <th>Count</th>
                            <th>Optimized Out</th>
                        </tr>
                        </thead>
                        <tbody>
                        {
                            allAllocations.map(alloc =>
                            <AllocationType key={alloc.id} alloc={alloc}
                                metadata={this.props.metadata}
                                allRoutineChildren={this.props.allRoutineChildren}
                            />
                            )
                        }
                        </tbody>
                    </Table>
                </Row>
            </Container>
        );
    }
}
