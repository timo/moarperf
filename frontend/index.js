import $ from 'jquery';
import React from 'react';
import { render } from 'react-dom';
import { combineReducers, createStore, applyMiddleware } from 'redux';
import { Provider, connect } from 'react-redux';
import { HashRouter, Route, Switch, Link, Redirect } from 'react-router-dom';
import thunkMiddleware from 'redux-thunk';
import WSAction from 'redux-websocket-action';
import Loadable from 'react-loadable';

import {
  InputGroupAddon, InputGroup, Input, Button,
  Container, Row, Col
} from 'reactstrap';

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
    <form onSubmit={(e) => { props.onLoadFile(e); e.preventDefault(); }}>
      <InputGroup>
        <Input
            value={props.filePath}
            onChange={e => props.onChangeFilePath(e.target.value)}
        />
        <InputGroupAddon addonType="append">
          <Button onClick={props.onLoadFile}>Load File</Button>
        </InputGroupAddon>
      </InputGroup>

    </form>
  </div>
);

const ProfilerApp = props => (
    <Switch>
        <Route path={props.match.url + "routines"}>
            <RoutineList
                routines={props.profilerState.routineOverview}
                metadata={props.profilerState.routines}
                expanded={props.profilerState.expanded}
                allRoutineChildren={props.profilerState.allRoutineChildren}

                onExpandButtonClicked={props.onRoutineExpanded}
            />
        </Route>
        <Route exact path={props.match.url}>
            <Link to={props.match.url + "routines"}>Routines</Link>
        </Route>
        <Route><div>oh no.</div></Route>
    </Switch>
);

type HeapSnapshotAppProps = {
  tipText: string,
  onChangeFilePath: ?(string) => void,
  onLoadFile: ?(string) => void,
  modelState: string,
  loadedSnapshots: ?Array<HeapSnapshotState>,
  onRequestSnapshot: ?(number) => void,
};

const App = (props : HeapSnapshotAppProps) => (
  <Container>
      <Switch>
          <Route exact path="/">
            <React.Fragment>
              <GreetingsPage interest="everything" step="start"/>
              <SelectFile
                  filePath={props.tipText}
                  onChangeFilePath={props.onChangeFilePath}
                  onLoadFile={props.onLoadFile}
              />
              {
                  props.welcome.frontendMode === "heapsnapshot" ? (<Redirect to='/heap/' />) :
                      props.welcome.frontendMode === "profile" ? (<Redirect to='/prof/' />) : null
              }
            </React.Fragment>
          </Route>
          <Route path="/heap">
              <SnapshotList
                  modelState={props.heapanalyzer.modelState}
                  loadedSnapshots={props.heapanalyzer.loadedSnapshots}
                  onRequestSnapshot={props.heapanalyzer.onRequestSnapshot}
              />
          </Route>
          <Route path="/prof" render={({ match }) => (
              <ProfilerApp profilerState={props.profiler} onRoutineExpanded={props.onRoutineExpanded} match={match} />
              )} />
          <Route>
              <Row><Col>There is nothing at this URL. <Link to="/">Return</Link></Col></Row>
          </Route>
      </Switch>
  </Container>
);

function mapProps(state) {
  return state;
}
function mapDispatch(dispatch) {
  return {
    onChangeFilePath: text => dispatch(WelcomeActions.changeFilePath(text)),
    onLoadFile: () => dispatch(WelcomeActions.requestFile()),
    onRequestSnapshot: index => dispatch(HeapAnalyzerActions.requestSnapshot(index)),
    onRoutineExpanded: id => dispatch(ProfilerActions.expandRoutine(id))
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
    <HashRouter>
      <ConnectedApp />
    </HashRouter>
  </Provider>,
  document.getElementById('app'),
);
