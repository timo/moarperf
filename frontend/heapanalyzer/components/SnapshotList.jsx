import React, {useState} from 'react';

import { FormGroup, Form, Label, Input, Button, ButtonGroup } from 'reactstrap';

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

export default function SnapshotList(props : SnapshotListProps) {
  let [requestedSnapshot, setRequestedSnapshot] = useState("");

  if (props.modelState === 'post-load') {
    return [
      <div>
        <Form inline onSubmit={ev => { props.onRequestSnapshot(parseInt(requestedSnapshot)); ev.preventDefault() }}>
          <FormGroup>
            <Label>Request Snapshot</Label>
            <Input onChange={ev => setRequestedSnapshot(ev.target.value)} value={requestedSnapshot}/>
          </FormGroup>
        </Form>
        <div>
          Snapshots: <ButtonGroup>
          {
          props.loadedSnapshots.map(({ state, update_key }, index) => {
            let hasUpdateWidget = typeof update_key === "string"
                && typeof props.operations[update_key] !== "undefined";
            let interestingProgress = hasUpdateWidget && props.operations[update_key].progress[2] < 100;
            let updateWidget = interestingProgress
                ? <span><i className={"fas fa-spinner fa-pulse"} /> { props.operations[update_key].progress[2].toFixed(0) }%</span>
                : <></>;

            if (state !== "Unprepared") {
              return (
                  <Button
                      onClick={() => props.onSwitchSnapshot(index)}
                      active={props.currentSnapshot === index}
                      disabled={interestingProgress}>{index} {updateWidget}</Button>
              );
            }
          })
          }
        </ButtonGroup>
      </div>
      </div>
    ];
  } else if (props.modelState === 'pre-load') {
    return <div>Please wait for the model file to be loaded</div>;
  }
  return <div>What is a <em>{props.modelState}</em>??</div>;
};
