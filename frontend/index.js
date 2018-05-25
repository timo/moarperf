import $ from 'jquery';
import React from 'react';
import { render } from 'react-dom';
import { combineReducers, createStore, applyMiddleware } from 'redux';
import { Provider, connect } from 'react-redux';
import thunkMiddleware from 'redux-thunk';
import WSAction from 'redux-websocket-action';
import Loadable from 'react-loadable';

import * as HeapAnalyzerActions from './heapanalyzer/actions';
import heapAnalyzerReducer from './heapanalyzer/reducer';
import type { HeapSnapshotState } from './heapanalyzer/reducer';

import * as ProfilerActions from './profiler/actions';
import profilerReducer from './profiler/reducer';
import type { ProfilerState } from './profiler/reducer';

import * as WelcomeActions from './welcome/actions';
import welcomeReducer from './welcome/reducer';

import GreetingsPage from './welcome/GreetingsPage';

const RoutineList = Loadable({
  loader: () => import(/* webpackChunkName: "routinelist" */ './profiler/components/RoutineList'),
  loading: () => <div>Hold on ...</div>,
});

const SnapshotList = Loadable({
  loader: () => import(/* webpackChunkName: "snapshotlist" */ './heapanalyzer/components/SnapshotList'),
  loading: () => <div>Hold on ...</div>,
});

type SelectFileProps = {
  filePath: string,
  onChangeFilePath: (string) => void,
  onLoadFile: (string) => void,
}

const SelectFile = (props : SelectFileProps) => (
  <div>
    <h2>Load a file: heap snapshot or profiler data</h2>
    <div>
      <textarea
        rows="2"
        cols="100"
        maxLength="200"
        value={props.filePath}
        onChange={e => props.onChangeFilePath(e.target.value)}
      />
    </div>
    <input type="button" value="Load File" onClick={props.onLoadFile} />
  </div>
);

type HeapSnapshotAppProps = {
  tipText: string,
  onChangeFilePath: ?(string) => void,
  onLoadFile: ?(string) => void,
  modelState: string,
  loadedSnapshots: ?Array<HeapSnapshotState>,
  onRequestSnapshot: ?(number) => void,
}

const App = (props : HeapSnapshotAppProps) => (
  <div>
    { props.welcome.frontendMode === 'welcome'
      ? <GreetingsPage interest="everything" step="start" />
      : null }
    {
      props.welcome.frontendMode === 'welcome' ? (
        <SelectFile
          filePath={props.tipText}
          onChangeFilePath={props.onChangeFilePath}
          onLoadFile={props.onLoadFile}
        />)
      : (props.welcome.frontendMode === 'heapsnapshot' ? (
        <SnapshotList
          modelState={props.heapanalyzer.modelState}
          loadedSnapshots={props.heapanalyzer.loadedSnapshots}
          onRequestSnapshot={props.heapanalyzer.onRequestSnapshot}
        />)
        : (<RoutineList routines={[]} />))
    }
  </div>
);

function mapProps(state) {
  return state;
}
function mapDispatch(dispatch) {
  return {
    onChangeFilePath: text => dispatch(WelcomeActions.changeFilePath(text)),
    onLoadFile: () => dispatch(WelcomeActions.requestFile()),
    onRequestSnapshot: index => dispatch(HeapAnalyzerActions.requestSnapshot(index)),
  };
}

const appReducer = combineReducers({
  welcome: welcomeReducer,
  heapanalyzer: heapAnalyzerReducer,
  profiler: profilerReducer,
});

const store = createStore(appReducer, applyMiddleware(thunkMiddleware));

const { host } = window.location;

const wsActionHeap = new WSAction(store, `ws://${host}/heap-status-messages`, {
  retryCount: 3,
  reconnectInterval: 3,
});
wsActionHeap.start();

const wsActionProfile = new WSAction(store, `ws://${host}/profile-status-messages`, {
  retryCount: 3,
  reconnectInterval: 3,
});
wsActionProfile.start();

// $.ajax({
//   url: '/model-overview',
//   type: 'GET',
//   success: body => store.dispatch({ ...body, type: Actions.MODEL_OVERVIEW }),
// });

const ConnectedApp = connect(mapProps, mapDispatch)(App);
render(
  <Provider store={store}>
    <ConnectedApp />
  </Provider>,
  document.getElementById('app'),
);
