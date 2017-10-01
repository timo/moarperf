import React from 'react';
import { render } from 'react-dom';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';
import * as Actions from './actions';
import { tipsyReducer } from './reducer';

var SubmitTip = props => (
    <div>
        <h2>Got a tip?</h2>
        <div>
            <textarea rows="2" cols="100" maxLength="200"
                value={props.tipText}
                onChange={e => props.onChangeTipText(e.target.value)} />
        </div>
        <input type="button" value="Add Tip" onClick={props.onAddTip} />
    </div>
);

var LatestTips = () => (
    <div>
        <h2>Latest Tips</h2>
        TODO
    </div>
);

var App = props => (
    <div>
        <SubmitTip tipText={props.tipText}
            onChangeTipText={props.onChangeTipText}
            onAddTip={props.onAddTip} />
        <LatestTips />
    </div>
);

function mapProps(state) {
    return state;
}
function mapDispatch(dispatch) {
    return {
        onChangeTipText: text => dispatch(Actions.changeTipText(text)),
        onAddTip: text => dispatch(Actions.addTip())
    };
}

let store = createStore(tipsyReducer);
let ConnectedApp = connect(mapProps, mapDispatch)(App);
render(
    <Provider store={store}>
        <ConnectedApp />
    </Provider>,
    document.getElementById('app'));
