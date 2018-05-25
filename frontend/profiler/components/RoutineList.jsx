import React from 'react';
import Routine from './Routine';

export default function RoutineList({ routines }) {
  return [
    <h2 key={0}>Routines</h2>,
    <table key={1}>
      <thead>
        <tr>
          <th>Routine</th>
          <th>Entries</th>
          <th>Time Spent</th>
        </tr>
      </thead>
      <tbody>
        {
          routines.map(routine => <Routine routine={routine} />)
        }
      </tbody>
    </table>,
  ];
}
