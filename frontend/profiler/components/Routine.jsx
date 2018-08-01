import React from 'react';
import { Container, Button, Table } from 'reactstrap';
import RoutineList from "./RoutineList";

export function numberFormatter(number, fractionDigits = 0, thousandSeperator = ',', fractionSeperator = '.') {
    if (number!==0 && !number || !Number.isFinite(number)) return number
    const frDigits = Number.isFinite(fractionDigits)? Math.min(Math.max(fractionDigits, 0), 7) : 0
    const num = number.toFixed(frDigits).toString()

    const parts = num.split('.')
    let digits = parts[0].split('').reverse()
    let sign = ''
    if (num < 0) {sign = digits.pop()}
    let final = []
    let pos = 0

    while (digits.length > 1) {
        final.push(digits.shift())
        pos++
        if (pos % 3 === 0) {final.push(thousandSeperator)}
    }
    final.push(digits.shift())
    return `${sign}${final.reverse().join('')}${frDigits > 0 ? fractionSeperator : ''}${frDigits > 0 && parts[1] ? parts[1] : ''}`
}

export function timeToHuman(time, suffix = 'ms', smaller) {
    if (time / 1000 >= 0.01 || typeof smaller === "undefined") {
        return (<span>{numberFormatter(time / 1000, 2)}
            <small>{suffix}</small></span>);
    }
    else {
        return (<span><u>{numberFormatter(time, 2)}
            <small>{smaller}</small></u></span>);
    }
}

export default function Routine({ routine, metadata, columns, expanded, allRoutineChildren, onExpandButtonClicked, maxTime }) {
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
          return (<td key={"inlineInfo"}>{(routine.inlined_entries * 100 / routine.entries).toPrecision(3)}% inlined</td>)
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
