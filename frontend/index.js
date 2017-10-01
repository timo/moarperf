import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider, connect } from 'react-redux';
import thunkMiddleware from 'redux-thunk';
import WSAction from 'redux-websocket-action';
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

var LatestTips = props => (
    <div>
        <h2>Latest Tips</h2>
        <ul>
        {props.tips.map(t => <li key={t.id}>{t.text}</li>)}
        </ul>
    </div>
);

var App = props => (
    <div>
        <SubmitTip tipText={props.tipText}
            onChangeTipText={props.onChangeTipText}
            onAddTip={props.onAddTip} />
        <LatestTips tips={props.latestTips} />
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

let store = createStore(tipsyReducer, applyMiddleware(thunkMiddleware));

let host = window.location.host;
let wsAction = new WSAction(store, 'ws://' + host + '/latest-tips', {
    retryCount:3,
    reconnectInterval: 3
});
wsAction.start();

let ConnectedApp = connect(mapProps, mapDispatch)(App);
render(
    <Provider store={store}>
        <ConnectedApp />
    </Provider>,
    document.getElementById('app'));
