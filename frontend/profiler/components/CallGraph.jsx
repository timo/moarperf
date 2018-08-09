import React, {Component} from 'react';
import { Breadcrumb, BreadcrumbItem, Container, Row, Col, Table, Button } from 'reactstrap';
import { Link } from 'react-router-dom';
import $ from 'jquery';
import {EntriesInfo, ExclusiveInclusiveTime, RoutineNameInfo, LinkButton, InlineInfo, numberFormatter} from "./RoutinePieces";

function AllocTableContent({allocations, parentSpeshJitEntries = 0, parentBareEntries = 0}) {
    return allocations.map((alloc) => {
        const bareAllocs = alloc.count - alloc.jit - alloc.spesh;
        return (
            <tr>
                <td>
                    {alloc.name}
                </td>
                <td>
                    {numberFormatter(bareAllocs)} <small>before spesh</small>
                    {parentBareEntries > 0 && <React.Fragment>
                        <br/>
                        <small>{numberFormatter(bareAllocs / (parentBareEntries - parentSpeshJitEntries), 2)} <small>per regular entry</small></small>
                    </React.Fragment>}
                </td>
                <td>
                    {numberFormatter(alloc.spesh + alloc.jit)} <small>after spesh/jit</small>
                    {parentSpeshJitEntries > 0 && <React.Fragment>
                        <br/>
                        <small>{numberFormatter((alloc.spesh + alloc.jit) / parentSpeshJitEntries, 2)} <small>per spesh/jit
                            entry</small>
                        </small>
                    </React.Fragment>
                    }
                </td>
            </tr>
        );
    })
}

export default class CallGraph extends Component<{ routines: *, callId: * }> {
    constructor (props) {
        super(props);
        this.state = {
            isLoading: {
                path: false,
                children: false,
                allocs: false,
                incAllocs: false,
                childIncAllocs: false,
            },
            error: null,
            allocsError: null,
            path: [],
            children: [],
            call: {},
            allocations: [],
            inclusiveAllocations: [],
            childInclusiveAllocations: {},
        }
    }

    // TODO prevent success callbacks if the call id has changed in the mean time.

    requestPathAndChildren() {
        this.setState((state) => ({
            isLoading: {
                ...state.isLoading,
                path: true,
                children: true,
                allocs: true
            }
        }));

        $.ajax({
            url: '/call-path/' + this.props.callId,
            type: 'GET',
            contentType: 'application/json',
            success: (path) => this.setState(state => ({isLoading: { path: false }, path: path.slice(0, -1) })),
            error: (xhr, errorStatus, errorText) => {this.setState(state => ({isLoading: { path: false }, error: errorStatus + errorText}))}
        });

        const stateChangeForChildren = (self, children) => {
            const childs = Array.from(children);
            const thisCall = childs.shift();
            self.setState((state) => ({
                isLoading: { children: false },
                children: childs.sort((a, b) => (b.inclusive - a.inclusive)),
                call: thisCall
            }));
        }

        $.ajax({
            url: '/call-children/' + this.props.callId,
            type: 'GET',
            contentType: 'application/json',
            success: (children) => stateChangeForChildren(this, children),
            error: (xhr, errorStatus, errorText) => {this.setState(state => ({isLoading: { children: false }, error: errorStatus + errorText}))}
        });

        const stateChangeForAlloc = (self, allocs) => {
            self.setState((state) => ({
                allocations: allocs,
                isLoading: { allocs: false }
            }));
        }

        $.ajax({
            url: '/call-allocations/' + this.props.callId,
            type: 'GET',
            contentType: 'application/json',
            success: (allocs) => stateChangeForAlloc(this, allocs),
            error: (xhr, errorStatus, errorText) => {this.setState(state => ({isLoading: { allocs: false }, allocsError: errorStatus + errorText}))}
        });
    }

    requestInclusiveAllocations() {
        this.setState((state) => ({
            isLoading: {
                incAllocs: true
            }
        }));

        const stateChangeForIncAllocs = (self, allocs) => {
            self.setState((state) => ({
                inclusiveAllocations: allocs,
                isLoading: { incAllocs: false }
            }))
        }

        $.ajax({
            url: '/inclusive-call-allocations/' + this.props.callId,
            type: 'GET',
            contentType: 'application/json',
            success: (allocs) => stateChangeForIncAllocs(this, allocs),
            error: (xhr, errorStatus, errorText) => {this.setState(state => ({isLoading: { incAllocs: false }, allocsError: errorStatus + errorText}))}
        })
    }

    requestChildInclusiveAllocations() {
        this.setState((state) => ({
            isLoading: {
                childIncAllocs: this.state.children.length
            }
        }));

        const stateChangeForIncAllocs = (self, allocs, child_id) => {
            self.setState((state) => ({
                isLoading: {
                    childIncAllocs: state.isLoading.childIncAllocs - 1
                },
                childInclusiveAllocations: {
                    ...state.childInclusiveAllocations,
                    [child_id]: allocs
                }
            }))
        };

        this.state.children.forEach((child, idx) => {
            $.ajax({
                url: '/inclusive-call-allocations/' + child.id,
                type: 'GET',
                contentType: 'application/json',
                success: (allocs) => stateChangeForIncAllocs(this, allocs, child.id),
                error: (xhr, errorStatus, errorText) => {this.setState(state => ({isLoading: { childIncAllocs: state.isLoading.childIncAllocs - 1 }, allocsError: errorStatus + errorText}))}
            })
        })
    }

    componentDidMount() {
        this.requestPathAndChildren()
    }

    componentDidUpdate(prevProps) {
        if (prevProps.callId !== this.props.callId) {
            this.setState((state) => ({
                isLoading: {
                    ...state.isLoading,
                    incAllocs: false,
                    childIncAllocs: false,
                },
                call: {},
                path: [],
                error: null,
                allocsError: null,
                allocations: [],
                inclusiveAllocations: [],
                childInclusiveAllocations: [],
            }));
            this.requestPathAndChildren();
        }
    }

    render() {
        let {
            routines,
            callId,
        } = this.props;

        let {
            call,
            isLoading: {
                path: loadingPath,
                children: loadingChildren,
                allocs: loadingAllocations,
                incAllocs: loadingInclusiveAllocations,
                childIncAllocs: loadingChildIncAllocations,
            },
            error,
            path,
            children,
            allocations,
            inclusiveAllocations,
            childInclusiveAllocations,
        } = this.state;

        if (loadingPath || loadingChildren || typeof call === "undefined") {
            return (<Container><div>Hold on...</div></Container>)
        }

        if (error) {
            return (<Container>
                <div>
                    Error: { error }
                </div>
            </Container>)
        }

        if (typeof routines[call.routine_id] === "undefined") {
            return (
                <Container>
                    <div>
                        Error: routine with ID { call.routine_id } apparently doesn't exist?!
                    </div>
                </Container>
            )
        }

        console.log("children:", children);
        console.log("path:", path);

        const routine = routines[call.routine_id];
        return (
            <Container>
                <Row>
                    <Col>
                        <Breadcrumb>
                            {
                                path.map((node, idx) => (
                                    <BreadcrumbItem key={"breadcrumb_" + idx}>
                                        <Link to={node.call_id.toString()}>
                                            { routines[node.routine_id].name }
                                        </Link>
                                    </BreadcrumbItem>
                                ))
                            }
                            <BreadcrumbItem active>{ routine.name }</BreadcrumbItem>
                        </Breadcrumb>
                    </Col>
                </Row>
                <Row><Col>
                    <h2>{routine.name}</h2>
                    <div>{routine.file}:{routine.line}</div>
                    <Table striped>
                        <tbody>
                        <tr>
                            <td>Entries</td>
                            <td>{numberFormatter(call.entries)}</td>
                        </tr>
                        <tr>
                            <td>Fully Jitted / Only Specialized</td>
                            <td>{numberFormatter(call.jit_entries)} / {numberFormatter(call.spesh_entries)}</td>
                        </tr>
                        <tr>
                            <td>Exclusive / Inclusive time</td>
                            <ExclusiveInclusiveTime routine={call}/>
                        </tr>
                        <tr>
                            <td>Inlined</td>
                            <InlineInfo routine={call}/>
                        </tr>
                        <tr>
                            <td>Specializer Info</td>
                            <td>
                                { call.osr && <span>OSR'd {call.osr} times</span> }
                                { call.deopt_one && <span>Partially Deopted {call.deopt_one} times</span> }
                                { call.deopt_all && <span>Fully Deopted {call.deopt_all} times</span> }
                            </td>
                        </tr>
                        </tbody>
                    </Table>
                </Col></Row>
                <Row><Col>
                    <Button onClick={() => this.requestChildInclusiveAllocations() }>Show allocations for all children</Button>
                <Table striped><tbody>
                    {
                        children.map((child, idx) => (<React.Fragment>
                            <tr key={"child_" + idx}>
                                <LinkButton target={child.id.toString()} icon={"arrow-right"}/>
                                <RoutineNameInfo routine={routines[child.routine_id]}/>
                                <EntriesInfo routine={child} parentEntries={call.entries}/>
                                <InlineInfo routine={child}/>
                                <ExclusiveInclusiveTime routine={child} maxTime={call.inclusive}/>
                            </tr>
                            {
                                childInclusiveAllocations.hasOwnProperty(child.id.toString()) && childInclusiveAllocations[child.id.toString()].length > 0 &&
                                <tr><td colSpan={5}>
                                    <Table striped><tbody>
                                    <AllocTableContent
                                        allocations={childInclusiveAllocations[child.id.toString()]}
                                        parentBareEntries={child.entries}
                                        parentSpeshJitEntries={child.jit_entries + child.spesh_entries} />
                                    </tbody></Table>
                                </td></tr>
                            }
                            </React.Fragment>
                        ))
                    }
                </tbody></Table></Col></Row>
                <Row><Col>
                        <h2>Allocations</h2>
                        <Table striped><tbody>
                        <AllocTableContent allocations={allocations} parentBareEntries={call.entries} parentSpeshJitEntries={call.spesh_entries + call.jit_entries} />
                        { loadingAllocations && <th><td colSpan={3}><span>Loading allocations...</span></td></th> }
                        { inclusiveAllocations.length === 0 && <Button onClick={() => this.requestInclusiveAllocations()}>Load inclusive allocations</Button> }
                        { loadingInclusiveAllocations && <th><td colSpan={3}><span>Loading inclusive allocations...</span></td></th> }
                        { inclusiveAllocations.length !== 0 && <th><td colSpan={3}>Inclusive Allocations</td></th>}
                        <AllocTableContent allocations={inclusiveAllocations} parentBareEntries={call.entries} parentSpeshJitEntries={call.spesh_entries + call.jit_entries} />
                        </tbody></Table>
                </Col></Row>
            </Container>
        )
    }
}