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

var TipList = props => (
    <div>
        <h2>{props.heading}</h2>
        <ul>
        {props.tips.map(t => <Tip key={t.id} {...props} {...t} />)}
        </ul>
    </div>
);

var Tip = props => (
    <li>
        {props.text} [<a href="#" onClick={() => props.onAgree(props.id)}>Agree</a>]
        [<a href="#" onClick={() => props.onDisagree(props.id)}>Disagree</a>]
    </li>
);

var App = props => (
    <div>
        <SubmitTip tipText={props.tipText}
            onChangeTipText={props.onChangeTipText}
            onAddTip={props.onAddTip} />
        <TipList heading="Latest Tips" tips={props.latestTips}
            onAgree={props.onAgree} onDisagree={props.onDisagree} />
        <TipList heading="Top Tips" tips={props.topTips}
            onAgree={props.onAgree} onDisagree={props.onDisagree} />
    </div>
);

function mapProps(state) {
    return state;
}
function mapDispatch(dispatch) {
    return {
        onChangeTipText: text => dispatch(Actions.changeTipText(text)),
        onAddTip: text => dispatch(Actions.addTip()),
        onAgree: id => dispatch(Actions.agree(id)),
        onDisagree: id => dispatch(Actions.disagree(id)),
    };
}

let store = createStore(tipsyReducer, applyMiddleware(thunkMiddleware));

['latest-tips', 'top-tips'].forEach(endpoint => {
    let host = window.location.host;
    let wsAction = new WSAction(store, 'ws://' + host + '/' + endpoint, {
        retryCount:3,
        reconnectInterval: 3
    });
    wsAction.start();
});

let ConnectedApp = connect(mapProps, mapDispatch)(App);
render(
    <Provider store={store}>
        <ConnectedApp />
    </Provider>,
    document.getElementById('app'));
