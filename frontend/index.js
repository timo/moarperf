import $ from 'jquery';
import React from 'react';
import {render} from 'react-dom';
import {applyMiddleware, combineReducers, createStore} from 'redux';
import {connect, Provider} from 'react-redux';
import {HashRouter, Link, Redirect, Route, Switch, withRouter} from 'react-router-dom';
import thunkMiddleware from 'redux-thunk';
import WSAction from 'redux-websocket-action';
import Loadable from 'react-loadable';
import ErrorBoundary from 'react-error-boundary';

import {Button, Col, Container, Input, InputGroup, InputGroupAddon, Nav, NavItem, NavLink, Row} from 'reactstrap';

import * as HeapAnalyzerActions from './heapanalyzer/actions';
import type {HeapSnapshotState} from './heapanalyzer/reducer';
import heapAnalyzerReducer from './heapanalyzer/reducer';

import * as ProfilerActions from './profiler/actions';
import profilerReducer from './profiler/reducer';

import * as WelcomeActions from './welcome/actions';
import welcomeReducer from './welcome/reducer';

/* import GreetingsPage from './welcome/GreetingsPage';
import { getGCOverview, getGCDetails } from "./profiler/actions"; */

const RoutineOverviewPage = Loadable({
  loader: () => import(/* webpackChunkName: "routinelist" */ './profiler/components/RoutineOverviewPage'),
  loading: () => <div>Hold on ...</div>,
});

const SnapshotList = Loadable({
  loader: () => import(/* webpackChunkName: "snapshotlist" */ './heapanalyzer/components/SnapshotList'),
  loading: () => <div>Hold on ...</div>,
});

const GCOverview = Loadable({
    loader: () => import(/* webpackChunkName: "gcoverview" */ './profiler/components/GCOverview'),
    loading: () => <div>Hold on ...</div>,
});

const CallGraph = Loadable({
    loader: () => import(/* webpackChunkName: "callgraph" */ './profiler/components/CallGraph'),
    loading: () => <div>Hold on ...</div>,
})

const AllocationViewer = Loadable({
    loader: () => import(/* webpackChunkName: "allocationviewer" */ './profiler/components/AllocationViewer'),
    loading: () => <div>Hold on ...</div>,
})

const OverviewPage = Loadable({
    loader: () => import(/* webpackChunkName: "overviewPage" */ './profiler/components/OverviewPage'),
    loading: () => <div>Hold on ...</div>,
})

type SelectFileProps = {
  filePath: string,
  onChangeFilePath: (string) => void,
  onLoadFile: (string) => void,
}

const SelectFile = (props : SelectFileProps) => (
  <div>
    <h2>Enter a local file path: profiler data in sql format or sqlite3 database file</h2>
    <form onSubmit={(e) => { props.onLoadFile(e); e.preventDefault(); }}>
      <InputGroup>
        <Input
            value={props.filePath}
            onChange={e => props.onChangeFilePath(e.target.value)}
        />
        <InputGroupAddon addonType="append">
          <Button onClick={props.onLoadFile}>Open File</Button>
        </InputGroupAddon>
      </InputGroup>
    </form>
      <h3>How to obtain a profile</h3>
      <p>All you have to do is run your script from the commandline the same way you would otherwise call it,
          but also pass these arguments directly to perl6, in other words before the script name or -e part:</p>
      <p><kbd>perl6 --profile --profile-filename=<var>/tmp/results.sql</var> <var>myScript.p6</var></kbd></p>
      <p>When you open the resulting <kbd>.sql</kbd> file in this tool, a <samp>.sqlite3</samp> file of the
          same name will be put next to it. If it already exists, a random name will be put between the filename
          and the extension, so any changes to the <samp>.sqlite3</samp> file you may have made will not be
          clobbered. However, this tool will not make changes to the file. It is safe to pass the <samp>.sqlite3</samp>
          filename on the second invocation.
      </p>
      <p>You can also invoke this tool's <kbd>service.p6</kbd> with a path as the argument. It will load the
          given file and immediately redirect you to the profiler when you open the app.</p>
  </div>
);

const path = (match, extra) => ((match.url.endsWith("/") ? match.url : match.url + "/") + extra);

const ProfilerApp = props => {
    console.log("profiler app match prop:", props.match);
    console.log("profiler app location prop:", props.location);
    return (
        <React.Fragment>
            <Nav tabs>
                <NavItem>
                    <NavLink tag={Link} to={props.match.url}>Overview</NavLink>
                </NavItem>
                <NavItem>
                    <NavLink tag={Link} to={path(props.match, "routines")}>Routines</NavLink>
                </NavItem>
                <NavItem>
                    <NavLink tag={Link} to={path(props.match, "callgraph")}>Explore Call Graph</NavLink>
                </NavItem>
                <NavItem>
                    <NavLink tag={Link} to={path(props.match, "allocations")}>Allocations</NavLink>
                </NavItem>
                <NavItem>
                    <NavLink tag={Link} to={path(props.match, "gc")}>GC</NavLink>
                </NavItem>
            </Nav>
            <Switch>
                <Route exact path={props.match.url + '/'}>
                    <OverviewPage/>
                </Route>
                <Route path={props.match.url + "/routines"}>
                    <RoutineOverviewPage profilerState={props.profilerState}
                                         onRequestRoutineOverview={props.onRequestRoutineOverview}
                                         onExpandButtonClicked={props.onRoutineExpanded}/>
                </Route>
                <Route path={props.match.url + "/gc"}>
                    <ErrorBoundary>
                        <GCOverview
                            onRequestGCOverview={props.onRequestGCOverview}
                            onGCExpandButtonClicked={props.onGCExpandButtonClicked}
                            {...props.profilerState.gc} />
                    </ErrorBoundary>
                </Route>
                <Route path={props.match.url + "/callgraph/:id?"} render={({match, location}) => (
                    <ErrorBoundary>
                        <CallGraph
                            routines={props.profilerState.routines}
                            callId={match.params.id}

                            onRequestRoutineOverview={props.onRequestRoutineOverview}
                        />
                    </ErrorBoundary>
                )}/>
                <Route path={props.match.url + "/allocations/:id?"} render={({match, location}) => (
                    <ErrorBoundary>
                        <AllocationViewer
                            typeId={match.params.id}
                            metadata={props.profilerState.routines}
                            allRoutineChildren={props.profilerState.allRoutineChildren}
                        />
                    </ErrorBoundary>
                )}/>
                <Route exact path={props.match.url}>
                    <OverviewPage/>
                </Route>
                <Route>
                    <div>oh no.</div>
                </Route>
            </Switch>
        </React.Fragment>
    );
};

type HeapSnapshotAppProps = {
  tipText: string,
  onChangeFilePath: ?(string) => void,
  onLoadFile: ?(string) => void,
  modelState: string,
  loadedSnapshots: ?Array<HeapSnapshotState>,
  onRequestSnapshot: ?(number) => void,
};

const App = (props : HeapSnapshotAppProps) => (
  <React.Fragment>
      {
          props.profiler.fullscreen && <style>
              {
                  `
                  .container {
                    max-width: unset;
                  }

                  .container .container {
                    max-width: 90%;
                  }
                  `
              }
          </style>
      }
  <Container>
      <h1>
          <Button onClick={props.onAppFullscreenClicked}><i className="fas fa-arrows-alt-h"></i></Button>
          {" "}
          <Button tag={Link} to={"/"}><i className="fas fa-home"/></Button>
          {" "} MoarVM Performance Tool
      </h1>
      <Switch>
          <Route exact path="/">
            <React.Fragment>
              { /* <GreetingsPage interest="everything" step="start"/> */ }
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
          <Route path="/prof" render={({ match, location }) => (
              <ProfilerApp
                  profilerState={props.profiler}
                  onRoutineExpanded={props.onRoutineExpanded}
                  onRequestGCOverview={props.onRequestGCOverview}
                  onRequestRoutineOverview={props.onRequestRoutineOverview}
                  onGCExpandButtonClicked={props.onGCExpandButtonClicked}
                  match={match}
                  location={location} />
              )} />
          <Route>
              <Row><Col>There is nothing at this URL. <Link to="/">Return</Link></Col></Row>
          </Route>
      </Switch>
  </Container>
  </React.Fragment>
);

function mapProps(state) {
  return state;
}
function mapDispatch(dispatch) {
  return {
    onChangeFilePath: text => dispatch(WelcomeActions.changeFilePath(text)),
    onLoadFile: () => dispatch(WelcomeActions.requestFile()),
    onRequestSnapshot: index => dispatch(HeapAnalyzerActions.requestSnapshot(index)),
    onRoutineExpanded: id => dispatch(ProfilerActions.expandRoutine(id)),
    onRequestGCOverview: () => dispatch(ProfilerActions.getGCOverview()),
    onRequestRoutineOverview: () => dispatch(ProfilerActions.getRoutineOverview()),
    onGCExpandButtonClicked: (seq_nr) => dispatch(ProfilerActions.getGCDetails(seq_nr)),
    onAppFullscreenClicked: () => dispatch(ProfilerActions.toggleFullscreen())
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

$.ajax({
  url: '/whats-loaded',
  type: 'GET',
  success: body => {
      if (body.filetype === "profile") {
          if (window.location.hash === "#/") {
              window.location.replace("#/prof/");
          }
      }
  }
});

const ConnectedApp = withRouter(connect(mapProps, mapDispatch)(App));
render(
  <Provider store={store}>
    <HashRouter>
      <ConnectedApp />
    </HashRouter>
  </Provider>,
  document.getElementById('app'),
);
