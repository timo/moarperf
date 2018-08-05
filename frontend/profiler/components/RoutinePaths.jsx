import React, {Component} from 'react';
import $ from 'jquery';
import { Container, Button, Table } from 'reactstrap';
import {ROUTINE_CHILDREN_GET} from "../actions";

export default class RoutinePaths extends Component<{routineId: *, allRoutines: *}> {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: false,
            error: null,
            paths: [],
            pathDepth: 0
        }
    }

    componentDidMount() {
        this.state.isLoading = true;
        function calculateDepth(tree) {
            var childArray;
            if (tree instanceof Array) {
                childArray = tree;
            }
            else {
                if (tree.children.length === 0) {
                    return 0;
                }
                childArray = tree.children;
            }
            console.log("calculating depth of", childArray);
            let max = 0;
            for (const children of childArray) {
                const childVal = calculateDepth(children.children);
                if (childVal > max)
                    max = childVal;
            }
            return max + 1;
        }
        $.ajax({
            url: '/routine-paths/' + this.props.routineId,
            type: 'GET',
            contentType: 'application/json',
            success: (paths) => this.setState(state => ({isLoading: false, paths: paths, pathDepth: calculateDepth(paths)})),
            error: (xhr, errorStatus, errorText) => {this.setState(state => ({isLoading: false, error: errorStatus + errorText}))}
        });
    }

    render() {
        if (this.state.isLoading) {
            return (<div>Hold on ...</div>)
        }
        if (this.state.error) {
            return (<div>Error occurred: {this.state.error}</div>)
        }
        let result = [];
        let row = [];
        let showLines = [];
        let key = 0;
        let self = this;
        const tdStyle = {
            borderLeft: "1px solid darkgrey"
        };
        function digestNode(children, node, depth = 1) {
            console.log("digesting children:", children, node);
            if (children.length > 0) {
                let first = 1;
                let last = children.length;
                for (const child of children) {
                    if (children.length > 1 && last-- > 1) {
                        showLines[depth] = 1;
                    }
                    else {
                        showLines[depth] = 0;
                    }
                    if (row.length == 0 && depth > 1) {
                        row = Array(depth - 1).fill(0).map((x, idx) => { return <td key={key++} style={showLines[idx + 1] ? tdStyle : {}}></td> });
                        console.log(row);
                    }
                    if (node.routine === null) {
                        row.push(<td key={key++} className="entrance" style={tdStyle}>Entry</td>);
                    }
                    else {
                        row.push(<td key={key++} className="entrance" style={tdStyle}>
                            {self.props.allRoutines[child.routine].name}
                        </td>);
                    }
                    digestNode(child.children, child, depth + 1);
                    if (first-- <= 0 && row.length > 0) {
                        result.push(<tr key={key++}>{row}</tr>);
                        row = [];
                    }
                }
            }
            else {
                /*if (node)
                    row.push(<td key={key++} style={tdStyle}>{self.props.allRoutines[node.routine].name} {node.call}</td>);
                else
                    row.push(<td key={key++} style={tdStyle}>What?</td>);*/
                result.push(<tr key={key++}>{row}</tr>);
                row = [];
            }
        }
        for (const thread of this.state.paths) {
            digestNode(thread.children.children, thread.children);
        }

        result.push(<tr key={key++}>{row}</tr>);
        return (
            <React.Fragment>
                <style>{`
                .entrance { position: relative }
                .entrance:before {
                    content: "";
                    position: absolute;
                    left: 0;
                    width: 0;
                    height: 0;
                    top: 50%;
                    margin-top: -5px;
                    display: block;
                    border-top: 5px solid transparent;
                    border-bottom: 5px solid transparent;

                    border-left: 5px solid darkgrey;
                }`}
                </style>
                <Table responsive>
                    { result }
                </Table>
            </React.Fragment>);
    }
}