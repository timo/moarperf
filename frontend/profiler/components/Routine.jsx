import React, {Component} from 'react';
import { Container, Button, Nav, NavItem, NavLink } from 'reactstrap';
import classnames from 'classnames';

import RoutineList from "./RoutineList";
import RoutinePaths from "./RoutinePaths";

import {ExclusiveInclusiveTime, EntriesInfo, InlineInfo} from "./RoutinePieces";

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
                return <EntriesInfo routine={routine} parentEntries={parentEntries} />;
            },
            exclusiveInclusiveTime() {
                return <ExclusiveInclusiveTime routine={routine} maxTime={maxTime}/>
            },
            inlineInfo() {
                return <InlineInfo routine={routine}/>
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
