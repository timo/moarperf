import React from 'react';

export default function Routine({ routine }) {
  console.log(routine);
  return (
    <tr>
      <td>
        {routine.name}<br />
        <span className="routineFileInfo">{routine.filename}:{routine.line}</span>
      </td>
      <td>{routine.entries}</td>
      <td>{routine.exclusiveTime}</td>
    </tr>
  );
}
