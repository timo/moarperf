import React from 'react';
import { ResponsiveContainer, CartesianGrid, BarChart, Bar, LineChart, Line, Tooltip, XAxis, YAxis } from 'recharts';

import { useState } from 'react';

/* TODO: put this in a proper module of its own */
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


type HighscoreColumnData = { [string]: number };

type HighscoreInputData = [
  {
    frames_by_size: Array<HighscoreColumnData>,
    frames_by_count: Array<HighscoreColumnData>,
    types_by_size: Array<HighscoreColumnData>,
    types_by_count: Array<HighscoreColumnData>,
    frame_details: { [number]: { cuid: string, name: string, file: string, line: number } },
    type_details: { [number]: { name: string, repr: string } }
  }
];

type SnapshotIndex = number;
type LineKey = string;

type HighscoreGraphData = {
  frames_by_size: Array<{
    snapshot: SnapshotIndex,
    [LineKey]: number,
  }>
};

type SnapshotListProps = {
  modelState: "post-load",
  loadedSnapshots: Array<HeapSnapshotState>,
  onRequestSnapshot: (number) => void,
  operations: Array<any>,
  highscores: any,
} | {
  modelState: "pre-load"
}

function ProgressBoxes({ progress }) {
    var elements = [];
    for (let i = 0; i < progress[1]; i++) {
      elements.push(<span key={i} style={{paddingLeft: "1em", height: "1em", border: "1px solid #000", backgroundColor: i > progress[0] ? "#999" : "#4b4"}} />);
    }
    return elements
}

function HighscoreLineChart({ highscores, dataKey: key, numberOfLines = 5 }) {
  let data = highscores[key];
  var allKeys = {};
  var scorePerKey = {};
  for (let entry of data) {
    for (let innerKey in entry) {
      allKeys[innerKey] = 1;
      if (typeof scorePerKey[innerKey] === "undefined") {
        scorePerKey[innerKey] = 0;
      }
      scorePerKey[innerKey] += entry[innerKey];
    }
  }

  var keyList = [];
  for (let key in allKeys) {
    keyList.push(key);
  }

  keyList.sort((a, b) => ( scorePerKey[b] - scorePerKey[a] ));

  keyList = keyList.slice(0, numberOfLines);

  let startValue = 5;
  let endValue   = 80;
  let valueStep  = (endValue - startValue) / numberOfLines;

  return (
    <ResponsiveContainer height={300}>
      <LineChart data={data}>
        <XAxis/>
        <YAxis width={100} tickFormatter={numberFormatter}/>
        <CartesianGrid fill="white" horizontal={false} vertical={false} />
        {
          keyList.map((key, index) => (
              <Line dataKey={key} key={key} dot={false} stroke={"hsl(199, 90%, " + (valueStep * index) + "%)"} />
          ))
        }
        <Tooltip content={(stuff) => {
            const outer = stuff.payload;
            return (
                <div style={{ background: "#ddd" }}>
                  <ul>
                {
                    outer.map(val => ( <li>{ val.name  }: { numberFormatter(val.value) }</li> ))
                }
                </ul>
                </div>
            );
        }}/>
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function SnapshotList(props : SnapshotListProps) {
  let [numberOfTopSpots, setNumberOfTopSpots] = useState(10);
  let numberOfSpotChange = e => setNumberOfTopSpots(e.target.value);
  if (props.modelState === 'post-load') {
    return [
      <div> <h2>Snapshots</h2>
        <ul> {
          props.loadedSnapshots.map(({ state, update_key }, index) => {
            if (props.operations.length > 0 && typeof update_key === "string") {
              if (typeof props.operations[update_key] !== "undefined") {
                console.log("here's a snapshot with an update in it!");
                console.log(props.operations[update_key]);
              }
            }
            let updateWidget = typeof update_key === "string" ?
               typeof props.operations[update_key] !== "undefined" ?
                   <ProgressBoxes progress={props.operations[update_key].progress} />
                   : <></>
                : <></>;
            return (
              <li key={index}><div><span>Snapshot {index}</span>: {state.state}</div>
                {
                  state === 'Unprepared' ?
                    <button onClick={() => props.onRequestSnapshot(index)}>Request</button>
                      :
                  state === 'Preparing' ?
                    <><div>Preparing { updateWidget }</div></>
                      :
                  state === "Ready" ?
                      <></>
                      :
                    <div><em>{state.state}</em></div>
                }
              </li>)
            })
          }
        </ul>
      </div>,
        <div> <h2>Summaries</h2>
          <h3>Total Heap Size</h3>
          <ResponsiveContainer  height={200}>
            <BarChart data={props.summaries}>
              <XAxis dataKey={"gc_seq_num"}/>
              <YAxis width={100}/>
              <Bar dataKey={"total_heap_size"} fill={"#d43d51"}/>
            </BarChart>
          </ResponsiveContainer>
          <h3>Total Object Count</h3>
          <ResponsiveContainer height={200}>
            <BarChart data={props.summaries}>
              <Bar dataKey={"total_objects"} stackId={"objcount"} fill={"#00876c"} />
              <XAxis dataKey={"gc_seq_num"}/>
              <YAxis width={100}/>
            </BarChart>
          </ResponsiveContainer>
          <h3>Typeobjects, STables, and Frames</h3>
          <ResponsiveContainer height={200}>
            <BarChart data={props.summaries}>
              <Bar dataKey={"total_typeobjects"} stackId={"objcount"} fill={"#87b174"}/>
              <Bar dataKey={"total_stables"} stackId={"objcount"} fill={"#e49158"}/>
              <Bar dataKey={"total_frames"} stackId={"objcount"} fill={"#d43d51"}/>
              <XAxis dataKey={"gc_seq_num"}/>
              <YAxis width={100}/>
            </BarChart>
          </ResponsiveContainer>
          <h3>References</h3>
          <ResponsiveContainer  height={200}>
            <BarChart data={props.summaries}>
              <Bar dataKey={"total_refs"}  fill={"#e49158"}/>
              <XAxis dataKey={"gc_seq_num"}/>
              <YAxis width={100}/>
            </BarChart>
          </ResponsiveContainer>
        </div>,
        <div>
          <h2>Top <input value={numberOfTopSpots} onChange={numberOfSpotChange} style={{ width:"5em" }} /> scores</h2>
          {
            typeof props.highscores === "undefined"
                ? <div>Waiting for results...</div>
                :
            <>
              <h3>Top objects by size</h3>
              <HighscoreLineChart highscores={props.highscores} dataKey={"types_by_size"} numberOfLines={numberOfTopSpots} />
              <h3>Top objects by count</h3>
              <HighscoreLineChart highscores={props.highscores} dataKey={"types_by_count"} numberOfLines={numberOfTopSpots} />
              <h3>Top frames by size</h3>
              <HighscoreLineChart highscores={props.highscores} dataKey={"frames_by_size"} numberOfLines={numberOfTopSpots} />
              <h3>Top frames by count</h3>
              <HighscoreLineChart highscores={props.highscores} dataKey={"frames_by_count"} numberOfLines={numberOfTopSpots} />
            </>
          }
        </div>
    ];
  } else if (props.modelState === 'pre-load') {
    return <div>Please wait for the model file to be loaded</div>;
  }
  return <div>What is a <em>{props.modelState}</em>??</div>;
};
