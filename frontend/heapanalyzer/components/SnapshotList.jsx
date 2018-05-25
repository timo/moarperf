import React from 'react';

type SnapshotListProps = {
  modelState: "post-load",
  loadedSnapshots: Array<HeapSnapshotState>,
  onRequestSnapshot: (number) => void,
} | {
  modelState: "pre-load"
}

export default function SnapshotList(props : SnapshotListProps) {
  if (props.modelState === 'post-load') {
    return (
      <div> <h2>Snapshots</h2>
        <ul> {
          props.loadedSnapshots.map((state, index) =>
            ( // eslint-disable-next-line react/no-array-index-key
              <li key={index}><div><span>Snapshot {index}</span>: {state}</div>
                {
                  state === 'Unprepared' ?
                    <button onClick={() => props.onRequestSnapshot(index)}>Request</button>
                      :
                  state === 'Preparing' ?
                    <div>Preparing</div>
                      :
                    <div><em>{state}</em></div>
                }
              </li>))
          }
        </ul>
      </div>);
  } else if (props.modelState === 'pre-load') {
    return <div>Please wait for the model file to be loaded</div>;
  }
  return <div>What is a <em>{props.modelState}</em>??</div>;
};
