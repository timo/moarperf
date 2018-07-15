import React from 'react';
import { Container, Button, Table } from 'reactstrap';
import RoutineList from "./RoutineList";

function timeToHuman(time) {
    return (<span>{(time / 1000).toFixed(3)}ms</span>);
}

export default function Routine({ routine, metadata, columns, expanded, allRoutineChildren, onExpandButtonClicked }) {
  if (typeof columns === "string") {
      columns = columns.split(" ");
  }
  const myMetadata = metadata[routine.id];
  let columnFunctions = {
      expand() {
          return (<td key={"expand"}><Button onClick={() => onExpandButtonClicked(routine.id)}><i className="fas fa-folder-open"></i></Button></td>)
      },
      sitecount() {
          return (<td key={"sitecount"}>{routine.sitecount}</td>)
      },
      nameInfo() {
          return (<td key={"nameInfo"}>
              <span className="routineName">{myMetadata.name}</span><br />
              <span className="routineFileInfo">{myMetadata.file}:{myMetadata.line}</span>
          </td>)
      },
      entriesInfo() {
          return (<td key={"entriesInfo"}>{routine.entries} {" "}
              <small>{(routine.jit_entries * 100 / routine.entries).toPrecision(3)}% jit</small>
          </td>)
      },
      exclusiveInclusiveTime() {
          return (<td key={"exclusiveInclusiveTime"}>{timeToHuman(routine.exclusive_time)} / {timeToHuman(routine.inclusive_time)}</td>)
      },
      inlineInfo() {
          return (<td key={"inlineInfo"}>{(routine.jit_entries * 100 / routine.entries).toPrecision(3)}% inlined</td>)
      }
  };
  return [
    <tr key={routine.id + "_entry"}>
      {
        columns.map((name) => columnFunctions[name]())
      }
    </tr>,
      expanded &&
        <tr key={routine.id + "expanded"}>
            <td colSpan={columns.length}>
              <Container>
                  {
                      (!allRoutineChildren || typeof allRoutineChildren[routine.id] === "undefined")
                      && <span>Loading, hold on ...</span>
                  }
                  {
                      (allRoutineChildren && allRoutineChildren[routine.id])
                      && <RoutineList routines={allRoutineChildren[routine.id]}
                                      metadata={metadata}
                                      columns={"sitecount nameInfo entriesInfo inlineInfo exclusiveInclusiveTime"}
                      />
                  }
              </Container>
            </td>
        </tr>
  ];
}
