import React, {useState} from 'react';

import { Button, ButtonGroup } from 'reactstrap';

/* TODO: put this in a proper module of its own */
export function numberFormatter(number, fractionDigits = 0, thousandSeperator = ',', fractionSeperator = '.') {
  if (number!==0 && !number || !Number.isFinite(number)) return number;
  const frDigits = Number.isFinite(fractionDigits)? Math.min(Math.max(fractionDigits, 0), 7) : 0;
  const num = number.toFixed(frDigits).toString();

  const parts = num.split('.');
  let digits = parts[0].split('').reverse();
  let sign = '';
  if (num < 0) {sign = digits.pop()}
  let final = [];
  let pos = 0;

  while (digits.length > 1) {
    final.push(digits.shift());
    pos++;
    if (pos % 3 === 0) {final.push(thousandSeperator)}
  }
  final.push(digits.shift());
  return `${sign}${final.reverse().join('')}${frDigits > 0 ? fractionSeperator : ''}${frDigits > 0 && parts[1] ? parts[1] : ''}`
}

type SnapshotListProps = {
  modelState: "post-load",
  currentSnapshot: number,
  loadedSnapshots: Array<HeapSnapshotState>,
  onRequestSnapshot: (number) => void,
  onSwitchSnapshot: (number) => void,
  operations: Array<any>,
  highscores: any,
} | {
  modelState: "pre-load"
}

function ProgressBoxes({ progress }) {
    var elements = [];
    for (let i = 0; i < progress[1]; i++) {
      elements.push(<span key={i} style={{paddingLeft: "1em", height: "1em", backgroundColor: i > progress[0] ? "#999" : "#4b4"}} />);
    }
    return <span style={{border: "1px solid #000" }}>{ elements }</span>
}

export default function SnapshotList(props : SnapshotListProps) {
  let [requestedSnapshot, setRequestedSnapshot] = useState("");

  if (props.modelState === 'post-load') {
    return [
      <div> <h2>Snapshots</h2>
        <div>Request Snapshot
          <form onSubmit={ev => { props.onRequestSnapshot(parseInt(requestedSnapshot)); ev.preventDefault() }}>
            <input onChange={ev => setRequestedSnapshot(ev.target.value)} value={requestedSnapshot}/>
          </form>
        <ul> {
          props.loadedSnapshots.map(({ state, update_key }, index) => {

            let updateWidget = typeof update_key === "string" && typeof props.operations[update_key] !== "undefined"
                ? <ProgressBoxes progress={props.operations[update_key].progress} />
                : <></>;
            if (state !== "Unprepared") {
              return (
                  <li key={index}>
                    <div><span>Snapshot {index}</span>: {state}
                    {
                      state === 'Preparing' &&
                          <>
                            {" "} {updateWidget}
                          </>
                    }
                    {
                        index === props.currentSnapshot &&
                            <> {" "} Selected </>
                          ||
                        <>{" "}<Button onClick={() => props.onSwitchSnapshot(index)}>Select</Button></>
                    }
                    </div>
                  </li>)
            }
            })
          }
        </ul>
      </div>
      </div>
    ];
  } else if (props.modelState === 'pre-load') {
    return <div>Please wait for the model file to be loaded</div>;
  }
  return <div>What is a <em>{props.modelState}</em>??</div>;
};
