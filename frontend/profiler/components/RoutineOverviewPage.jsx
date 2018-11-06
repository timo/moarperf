import ErrorBoundary from "react-error-boundary";
import React, { useState, useEffect } from "react";
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
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isLoading && (props.profilerState.routineOverview.length === 0 || props.profilerState.routines.length === 0)) {
            setIsLoading(true);
            props.onRequestRoutineOverview();
        }
        else if (isLoading && props.profilerState.routineOverview.length !== 0 && props.profilerState.routines.length !== 0) {
            setIsLoading(false);
        }
    }, [props.profilerState.routineOverview, props.profilerState.routines]);

    if (isLoading) {
        return <div>Loading, hold on...</div>
    }

    return (
      <ErrorBoundary>
        <style>{`
        tr.scrolled td {
            background: #cef;
        }
        `}</style>
        {
            props.profilerState.routineOverview.length === 0 || props.profilerState.routines.length === 0
                ? <Button onClick={props.onRequestRoutineOverview}>Get Routine overview</Button>
                : null
        }
        <RoutineList
            routines={props.profilerState.routineOverview}
            metadata={props.profilerState.routines}
            expanded={props.profilerState.expanded}
            allRoutineChildren={props.profilerState.allRoutineChildren}

            onExpandButtonClicked={props.onExpandButtonClicked}

            defaultSort={"inclusive_time"}

            shouldScrollTo={+props.match.params.id}

            HeaderComponent={RoutineListHeaderComponent}
        />
      </ErrorBoundary>);
}