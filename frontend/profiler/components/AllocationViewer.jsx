import React, {Component} from 'react';
import {Container, Row, Table, Button} from 'reactstrap';
import $ from 'jquery';

import {numberFormatter} from './RoutinePieces';
import {AllocNameAndRepr} from "./AllocationParts";
import RoutineList from './RoutineList';

export function Bytes ({ size, totalCount, extraData }) {
    return <React.Fragment>
        <span>{numberFormatter(size)} <small>bytes {extraData && <span><small>+ x</small></span> || null}</small></span>
        {
            totalCount > 0 &&
            <React.Fragment>
                <br/>
                <small>
                <span>{numberFormatter(size * totalCount)} <small>bytes total</small></span>
                </small>
            </React.Fragment>
            || null
        }
    </React.Fragment>
}

export class AllocRoutineList extends Component {
    static defaultProps = {};

    static propTypes = {};

    state = {};

    render() {
        const HeaderComponent = self.props.HeaderComponent;

        return (
            <div>
                <HeaderComponent />
                <Table striped>
                    <tr>

                    </tr>
                </Table>
            </div>
        );
    }
}

export class AllocationType extends Component<{ onClick: () => any, alloc: any }> {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: {
                allocatingRoutines: false,
            },
            loadErrors: {
                allocatingRoutines: null,
            },
            isExpanded: false,
            allocatingRoutines: null,
        }
    }

    handleExpandClick = () => {
        console.log("handle expand called");
        if (this.state.isExpanded) {
            this.setState((state) => ({
                isExpanded: !state.isExpanded
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
                    allocatingRoutines: result.map((routine) => ({ ...routine, alloc })),
                }))
            };

            $.ajax({
                url: '/allocating-routines-per-type/' + this.props.alloc.id,
                type: 'GET',
                contentType: 'application/json',
                success: (routines) => stateChangeForRoutines(this, routines, this.props.alloc),
                error: (xhr, errorStatus, errorText) => {
                    this.setState(state => ({
                        isLoading: { allocatingRoutines: false },
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

    render() {
        let {
            isExpanded,
            isLoading,
            loadErrors,
            allocatingRoutines,
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
                        <div>
                            <AllocRoutineList routines={ allocatingRoutines }
                                         metadata={ this.props.metadata }
                                         allRoutineChildren={ this.props.allRoutineChildren }

                                         HeaderComponent={ (props) => <h3>Routines allocating { this.props.alloc.name }</h3> }

                                         // columns={"expand sitecount nameInfo "}
                            />
                        </div>
                    </React.Fragment>
                }
            }
            if (expandContent !== null)
                expandComponent =
                    <React.Fragment>
                        <tr>
                            <td colSpan={4}>
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
                    <Table responsive striped>
                        <tr>
                            <th style={{width: "1%"}}></th>
                            <th>Name<br/><small>REPR</small></th>
                            <th>Type Properties</th>
                            <th>Count</th>
                        </tr>
                        {
                            allAllocations.map(alloc =>
                            <AllocationType key={alloc.id} alloc={alloc}
                                metadata={this.props.metadata}
                                allRoutineChildren={this.props.allRoutineChildren}
                            />
                            )
                        }
                    </Table>
                </Row>
            </Container>
        );
    }
}
