import React, {Component} from 'react';
import RoutineList from "./RoutineList";

import $ from 'jquery';
import {RoutineListHeaderComponent} from "./RoutineOverviewPage";

class CallersList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: { callers: false },
            callers: null
        }
    }

    requestCallers() {
        this.setState((state) => ({
            isLoading: {
                callers: true
            }
        }));

        const stateChangeForCallers = (self, callers) => {
            self.setState((state) => ({
                callers: callers,
                isLoading: { callers: false }
            }))
        }

        $.ajax({
            url: '/routine-callers/' + encodeURIComponent(this.props.routineId),
            type: 'GET',
            contentType: 'application/json',
            success: (callers) => stateChangeForCallers(this, callers),
            error: (xhr, errorStatus, errorText) => {this.setState(state => ({isLoading: { callers: false }, allocsError: errorStatus + errorText}))}
        })
    }

    componentDidMount() {
        this.requestCallers();
    }

    render() {
        if (this.state.isLoading.callers || this.state.callers === null) {
            return (<div>Loading, please wait...</div>);
        }
        return (
            <div>
                <RoutineList metadata={this.props.metadata}
                             routines={this.state.callers}
                             columns={"sitecount nameInfo inlineInfo entriesInfo"}

                             HeaderComponent={RoutineListHeaderComponent}
                />
            </div>
        );
    }
}

export default CallersList;