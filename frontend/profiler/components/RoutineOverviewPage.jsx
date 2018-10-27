import ErrorBoundary from "react-error-boundary";
import React from "react";
import { Button } from 'reactstrap';

import RoutineList from './RoutineList';

export default function RoutineOverviewPage(props) {
    const HeaderComponent = (props) => {
        return (
            <React.Fragment>
                <h2>Routines</h2>
                <Button onClick={() => props.onChangeSorting("name")}>Name</Button>
                <Button onClick={() => props.onChangeSorting("file")}>Filename</Button>
                <Button onClick={() => props.onChangeSorting("entries")}>Entries</Button>
            </React.Fragment>
        )
    }

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

            HeaderComponent={HeaderComponent}
        />
      </ErrorBoundary>);
}