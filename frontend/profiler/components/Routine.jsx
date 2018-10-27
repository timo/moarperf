import React, {Component} from 'react';
import { Container, Button, Table, Nav, NavItem, NavLink } from 'reactstrap';
import classnames from 'classnames';
import $ from 'jquery';

import RoutineList from "./RoutineList";
import RoutinePaths from "./RoutinePaths";

import {ExclusiveInclusiveTime, EntriesInfo, InlineInfo, RoutineNameInfo} from "./RoutinePieces";
import {AllocTableContent} from "./AllocationParts";
import CallersList from "./CallersList";

export default class Routine extends Component<{ routine: *, metadata: *, columns: *, expanded: *, allRoutineChildren: *, onExpandButtonClicked: *, maxTime: *, parentEntries: * }> {
    constructor(props) {
        super(props);
        this.state = {
            tab: "callees",
            allocations: null,
            allocsError: null,
        }
    }

    requestAllocations() {
        const stateChangeForAlloc = (self, allocs) => {
            self.setState((state) => ({
                allocations: allocs,
            }));
        }

        $.ajax({
            url: '/routine-allocations/' + this.props.routine.id,
            type: 'GET',
            contentType: 'application/json',
            success: (allocs) => stateChangeForAlloc(this, allocs),
            error: (xhr, errorStatus, errorText) => {
                this.setState(state => ({allocsError: errorStatus + errorText}))
            }
        });
    }

    render() {
        let {routine, metadata, columns, expanded, allRoutineChildren, onExpandButtonClicked, maxTime, parentEntries} = this.props;
        if (routine === null) {
            return "";
        }
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
                return <RoutineNameInfo key="nameinfo" routine={myMetadata} />
            },
            entriesInfo() {
                return <EntriesInfo  key="entriesinfo" routine={routine} parentEntries={parentEntries} />;
            },
            exclusiveInclusiveTime() {
                return <ExclusiveInclusiveTime key="exclusiveinclusivetime" routine={routine} maxTime={maxTime}/>
            },
            inlineInfo() {
                return <InlineInfo key="inlineinfo" routine={routine}/>
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
                                        defaultSort={(a, b) => b.inclusive_time - a.inclusive_time}
                        />
                    }
                </Container>);
            }
            else if (this.state.tab === "callers") {
                expandedComponent = (<Container>
                    <CallersList metadata={metadata}
                                 routineId={routine.id}/>
                </Container>);
            }
            else if (this.state.tab === "paths") {
                expandedComponent = (<Container>
                        <RoutinePaths routineId={routine.id} allRoutines={metadata}/>
                    </Container>);
            }
            else if (this.state.tab === "allocations") {
                if (this.state.allocations === null) {
                    expandedComponent = (<Container><span>Loading, hold on...</span></Container>)
                }
                else {
                    expandedComponent = (<Container>
                            <Table striped><tbody>
                            <AllocTableContent allocations={this.state.allocations} parentSites={routine.sitecount}/>
                            </tbody></Table>
                        </Container>
                    )
                }
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
                <td style={{paddingLeft: "5%", paddingRight: "5%"}} colSpan={columns.length}>
                    <Nav tabs>
                        <NavItem>
                            <NavLink className={classnames({active: this.state.tab === "callees"})} onClick={() => this.setState(state => state.tab = "callees")}>Callees</NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink className={classnames({active: this.state.tab === "callers"})} onClick={() => this.setState(state => state.tab = "callers")}>Callers</NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink className={classnames({active: this.state.tab === "paths"})} onClick={() => this.setState(state => state.tab = "paths")}>Paths</NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink
                                className={classnames({active: this.state.tab === "allocations"})}
                                onClick={() => { this.requestAllocations(); this.setState(state => state.tab = "allocations")}}>
                                Allocations
                            </NavLink>
                        </NavItem>
                    </Nav>
                    { expandedComponent }
                </td>
            </tr>
        ];
    }
}
