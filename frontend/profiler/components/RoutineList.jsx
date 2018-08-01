import React from 'react';
import { Table } from 'reactstrap';
import Routine from './Routine';

export default function RoutineList({ routines, metadata, expanded = [], allRoutineChildren, columns = "expand sitecount nameInfo entriesInfo exclusiveInclusiveTime", onExpandButtonClicked }) {
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

  const sortedRoutines = Array.from(routines).sort((a, b) => b.exclusive_time - a.exclusive_time);

  const maxTime = Array.from(routines).map(r => r.inclusive_time).sort().pop();

  return [
    <h2 key={0}>Routines</h2>,
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
                  maxTime={maxTime}
                  onExpandButtonClicked={onExpandButtonClicked}
                  expanded={expanded[routine.id]}
                  allRoutineChildren={allRoutineChildren}
              />))
        }
      </tbody>
    </Table>,
  ];
}
