import React, {useState, useEffect} from 'react';
import {Breadcrumb, BreadcrumbItem, Button, Col, Container, Row, Table, Input} from 'reactstrap';
import {Link, Redirect} from 'react-router-dom';
import $ from 'jquery';
import classnames from 'classnames';
import ErrorBoundary from 'react-error-boundary'
import {EntriesInfo, RoutineNameInfo, numberFormatter} from "./RoutinePieces";

const numberOrNothing = value => (
    value === 0 ? <small>-</small> : numberFormatter(value)
)

export default function SpeshOverview(props) {
    const [routineData, setRoutineData] = useState(null);
    useEffect(
        () => {
            $.ajax({
                url: '/routine-spesh-overview',
                type: 'GET',
                contentType: 'application/json',
                success: data => setRoutineData({ok: true, data }),
                error:  error => setRoutineData({ok: false, error })
            });
        }, []
    );

    useEffect(
        () => {
            if (typeof props.metadata === "undefined" || props.metadata.length === 0)
                props.onRequestRoutineOverview();
        }, [props.metadata]
    )

    const makeRoutineRow = routine => {
        console.log(routine, props.metadata[routine.id]);
        return (
            <tr key={routine.id}>
                <td>{numberFormatter(routine.sites)}</td>
                <RoutineNameInfo routine={props.metadata[routine.id]}/>
                <EntriesInfo routine={routine}/>
                <td>{numberOrNothing(routine.deopt_one)}</td>
                <td>{numberOrNothing(routine.deopt_all)}</td>
                <td>{numberOrNothing(routine.osr)}</td>
            </tr>
        );
    };

    const routineListPart =
        routineData === null
        || typeof props.metadata === "undefined"
        || props.metadata.length === 0 ?
            <>Loading...</>
        : routineData.ok === true ?
            <Table>
                <thead>
                <tr>
                    <th>Sites</th>
                    <th>Routine</th>
                    <th>Entries</th>
                    <th>Deopt One</th>
                    <th>Deopt All</th>
                    <th>OSR</th>
                </tr>
                </thead>
                <tbody>
                {
                    routineData.data.map(makeRoutineRow)
                }
                </tbody>
            </Table>
        :   <>Error: { routineData.error }</>

    return (
        <Container>
            <Row>
                <Col>
                    {
                        routineListPart
                    }
                </Col>
            </Row>
            <Row>
                <Col>
                    <h3>Specializer Performance</h3>
                    <p>
                        MoarVM comes with a dynamic code optimizer called "spesh".
                        It makes your code faster by observing at run time what
                        types are used where, what methods end up being called in
                        certain situations where there are multiple potential
                        candidates, and so on. This is called specialization, because
                        it creates versions of the code that take shortcuts based
                        on assumptions it made from the observed data.
                    </p>
                    <h2>Deoptimization</h2>
                    <p>
                        Assumptions, however, are there to be broken. Sometimes
                        the optimized and specialized code finds that an
                        assumption no longer holds. Parts of the specialized
                        code that detect this are called "guards". When a guard
                        detects a mismatch, the running code has to be switched
                        from the optimized code back to the unoptimized code.
                        This is called a "deoptimization", or "deopt" for
                        short.
                    </p>
                    <p>
                        Deopts are a natural part of a program's life, and at
                        low numbers they usually aren't a problem. For example,
                        code that reads data from a file would read from a
                        buffer most of the time, but at some point the buffer
                        would be exhausted and new data would have to be
                        fetched from the filesystem. This could mean a deopt.
                    </p>
                    <p>
                        If, however, the profiler points out a large amount of
                        deopts, there could be an optimization opportunity.
                    </p>
                    <h2>On-Stack Replacement (OSR)</h2>
                    <p>
                        Regular optimization activates when a function is
                        entered, but programs often have loops that run for
                        a long time until the containing function is entered
                        again.
                    </p>
                    <p>
                        On-Stack Replacement is used to handle cases like this.
                        Every round of the loop in the unoptimized code will
                        check if an optimized version can be entered. This has
                        the additional effect that a deoptimization in such
                        code can quickly lead back into optimized code.
                    </p>
                    <p>
                        Situations like these can cause high numbers of deopts
                        along with high numbers of OSRs.
                    </p>
                </Col>
            </Row>
        </Container>
    )
}