import $ from 'jquery';
import React from 'react';

export default class CodeEditor extends React.Component {
    requestBrowse() {
        $.ajax({
            url: '/browse',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({type: "script"}),
            success: ({filenames}) => this.setState({suggestedFiles: filenames})
        });
    }
    componentDidMount() {
        this.requestBrowse();
    }
    constructor(props) {
        super(props);
        this.state = {
            flags: [],
            filename: null,
            sourcecode: null,
            suggestedFiles: [],
            args: "",
        };
    }

    render() {
        let props = this.props;

        let buttonStyle = {
            border: "0px",
            background: "none"
        };

        return (
            <div>
                <h3>Perl 6 scripts in the current directory <button style={buttonStyle}><i className="fas fa-2x fa-sync-alt" /></button></h3>
                <ul className="fa-ul">
                    {
                        this.state.suggestedFiles.map((filename) => (
                            <li key={filename}>
                                <span className="fa-li"><i className="fas fa-2x fa-file-code" /></span>
                                <button style={buttonStyle}><i className="fas fa-2x fa-forward" /></button>
                                <button style={buttonStyle}><i className="fas fa-2x fa-edit" /></button>
                                {filename}</li>
                        ))
                    }
                </ul>
            </div>)
            ;
    }
};