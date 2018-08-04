import React, {Component} from 'react';
import { Container, Button, Table } from 'reactstrap';

export default class RoutinePaths extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: false,
            error: null,
            paths: []
        }
    }

    render() {
        if (this.state.isLoading) {
            return (<div>Hold on ...</div>)
        }
        if (this.state.error) {
            return (<div>Error occurred: {this.state.error}</div>)
        }
        return this.state.paths.map(path => {
            
            return 1;
        })
    }
}