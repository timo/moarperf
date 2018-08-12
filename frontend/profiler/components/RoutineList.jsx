import React, {Component} from 'react';
import { Table } from 'reactstrap';
import Routine from './Routine';

export default class RoutineList extends Component {
    static defaultProps = {
        expanded: [],
        columns: "expand sitecount nameInfo entriesInfo exclusiveInclusiveTime",
        headerComponent: <h2 key={0}>Routines</h2>,
        headerFunction: null,
        defaultSort: ((a, b) => b.exclusive_time - a.exclusive_time),
    }

    constructor(props) {
        super(props);
        this.state = {
            sortMode: "default",
            sortInvert: false,
            displayAmount: 100,
        }
    }

    render() {
        let {
            routines,
            metadata,
            expanded,
            allRoutineChildren,
            columns,
            maxTime,
            parentEntries,
            onExpandButtonClicked,
            headerComponent,
            defaultSort
        } = this.props;

        if (typeof columns === "string") {
            columns = columns.split(" ");
        }
        const nameMapping = {
            expand: "",
            sitecount: "Sites",
            nameInfo: "Name",
            entriesInfo: "Entries",
            exclusiveInclusiveTime: "Time",
            inlineInfo: "Inlined",
        };
        const styleMapping = {
            expand: {width: "10%"},
            sitecount: {width: "10%"},
            entriesInfo: {width: "15%"}
        };
        const sortFunc = defaultSort;
        const preSortedRoutines = Array.from(routines).sort(
            this.state.sortInvert ? (a, b) => sortFunc(b, a) : sortFunc
        );

        const sortedRoutines = preSortedRoutines.slice(0, this.state.displayAmount);

        const byInclusiveTime = typeof maxTime === "undefined" ? Array.from(routines).map(r => r.inclusive_time).sort((a, b) => a - b) : [];
        const myMaxTime = typeof maxTime === "undefined" ? byInclusiveTime.pop() : maxTime;
        console.log(maxTime, "is the max time.");
        return [
            headerComponent,
            <Table key={1} striped style={{tableLayout: "fixed"}}>
                <thead>
                <tr>
                    {columns.map((txt) => (<td key={txt} style={styleMapping[txt]}>{nameMapping[txt]}</td>))}
                </tr>
                </thead>
                <tbody>
                {
                    sortedRoutines.map((routine) =>
                        (<Routine
                            key={routine.id}
                            routine={routine}
                            metadata={metadata}
                            columns={columns}
                            maxTime={myMaxTime}
                            parentEntries={parentEntries}
                            onExpandButtonClicked={onExpandButtonClicked}
                            expanded={expanded[routine.id]}
                            allRoutineChildren={allRoutineChildren}
                        />))
                }
                {
                    sortedRoutines.length < preSortedRoutines.length &&
                        <tr>
                            <td colSpan={columns.length}>Showing {sortedRoutines.length } of { preSortedRoutines.length } routines</td>
                        </tr>
                }
                </tbody>
            </Table>,
        ];
    }
}
