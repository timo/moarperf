import ErrorBoundary from "react-error-boundary";
import React from "react";
import { Button } from 'reactstrap';

import RoutineList from './RoutineList';

export const RoutineListHeaderComponent = (props) => {
    return (
        <React.Fragment>
            <h2>Routines</h2>
            <Button size="sm" onClick={() => props.onChangeSorting("name")}>Name</Button>
            <Button size="sm" onClick={() => props.onChangeSorting("file")}>Filename</Button>
            <Button size="sm" onClick={() => props.onChangeSorting("entries")}>Entries</Button>
            <Button size="sm" onClick={() => props.onChangeSorting("inclusive_time")}>Inclusive Time</Button>
            <Button size="sm" onClick={() => props.onChangeSorting("exclusive_time")}>Exclusive Time</Button>
        </React.Fragment>
    )
}


export default function RoutineOverviewPage(props) {

    return (
      <ErrorBoundary>
        {
            props.profilerState.routineOverview.length === 0 || props.profilerState.routines.length === 0
                ? <Button onClick={props.onClick}>Get Routine overview</Button>
                : null
        }
        <RoutineList
            routines={props.profilerState.routineOverview}
            metadata={props.profilerState.routines}
            expanded={props.profilerState.expanded}
            allRoutineChildren={props.profilerState.allRoutineChildren}

            onExpandButtonClicked={props.onExpandButtonClicked}

            defaultSort={"inclusive_time"}

            HeaderComponent={RoutineListHeaderComponent}
        />
      </ErrorBoundary>);
}