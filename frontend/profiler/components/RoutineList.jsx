import React, { Component } from 'react';
import { Table, Button } from 'reactstrap';
import ErrorBoundary from 'react-error-boundary';

import Routine from './Routine';


export default class RoutineList extends Component {
    static defaultProps = {
      expanded: [],
      columns: 'expand sitecount nameInfo entriesInfo exclusiveInclusiveTime',
      HeaderComponent: () => (<h2 key={0}>Routines</h2>),
      defaultSort: 'exclusive_time',
    }

    constructor(props) {
      super(props);
      this.state = {
        sortTarget: props.defaultSort,
        sortInvert: false,
        displayAmount: 100,
        filter: {},
      };
      this.changeFilter = this.changeFilter.bind(this);
      this.changeSorting = this.changeSorting.bind(this);
    }

    changeFilter(filter) {
      this.setState((state) => { filter; });
    }

    changeSorting(sortTarget) {
      this.setState(state => ({
        sortTarget,
        sortInvert: sortTarget === state.sortTarget ? !state.sortInvert : false,
      }));
    }

    render() {
      let {
        routines,
        metadata,
        expanded,
        allRoutineChildren,
        columns,
        maxTime,
        parentEntries,
        onExpandButtonClicked,
        HeaderComponent,
        defaultSort,
        filterFunction,
        shouldScrollTo,
      } = this.props;

      const self = this;

      if (typeof columns === 'string') {
        columns = columns.split(' ');
      }
      const nameMapping = {
        expand: '',
        sitecount: 'Sites',
        nameInfo: 'Name',
        entriesInfo: 'Entries',
        exclusiveInclusiveTime: 'Time',
        inlineInfo: 'Inlined',
      };
      const styleMapping = {
        expand: { width: '7%' },
        sitecount: { width: '10%' },
        entriesInfo: { width: '15%' },
        inlineInfo: { width: '10%' },
      };

      const attrOfEither = (attr, a, b) => {
        if (a !== undefined) {
          if (a.hasOwnProperty(attr)) { return a[attr]; }
        }
        if (b !== undefined) {
          if (b.hasOwnProperty(attr)) { return b[attr]; }
        }
        return 0;
      };

      const comparify = (a, b) =>
        ((typeof a) === 'string' || (typeof b) === 'string'
          ? a.toString().localeCompare(b.toString())
          : b - a);

      const sortFunc =
            (a, b) =>
              comparify(
                attrOfEither(self.state.sortTarget, a, metadata[b.id]),
                attrOfEither(self.state.sortTarget, b, metadata[a.id]),
              );

      const filtered = filterFunction === null || typeof filterFunction === 'undefined'
        ? Array.from(routines)
        : routines.filter(filterFunction);

      const preSortedRoutines = filtered.sort(this.state.sortInvert ? (a, b) => sortFunc(b, a) : sortFunc);

      const sortedRoutines = preSortedRoutines.slice(0, this.state.displayAmount);

      const byInclusiveTime = typeof maxTime === 'undefined' ? Array.from(routines).map(r => r.inclusive_time).sort((a, b) => a - b) : [];
      const myMaxTime = typeof maxTime === 'undefined' ? byInclusiveTime.pop() : maxTime;
      console.log(maxTime, 'is the max time.');
      const loadMoreRoutines = () => self.setState(state => ({ displayAmount: state.displayAmount + 100 }));

      return (
        <React.Fragment>
          <HeaderComponent
            columns={columns}

            onChangeFilter={this.changeFilter}
            onChangeSorting={this.changeSorting}

            filter={this.state.filter}
            sortTarget={this.state.sortTarget}
            sortInvert={this.state.sortInvert}
          />
          <Table key={1} striped style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                {columns.map(txt => (<td key={txt} style={styleMapping[txt]}>{nameMapping[txt]}</td>))}
              </tr>
            </thead>
            <tbody>
              {
                sortedRoutines.map(routine => (
                  <ErrorBoundary key={routine.id}>
                    <Routine
                      routine={routine}
                      metadata={metadata}
                      columns={columns}
                      maxTime={myMaxTime}
                      parentEntries={parentEntries}
                      onExpandButtonClicked={onExpandButtonClicked}
                      expanded={expanded[routine.id]}
                      allRoutineChildren={allRoutineChildren}

                      shouldScrollTo={typeof shouldScrollTo === 'number' ? shouldScrollTo : undefined}
                    />
                  </ErrorBoundary>
                ))
              }
              {
                sortedRoutines.length < preSortedRoutines.length &&
                <ErrorBoundary>
                  <tr>
                    <td colSpan={columns.length}>
                      Showing {sortedRoutines.length } of { preSortedRoutines.length } routines.
                      <Button onClick={loadMoreRoutines}>Show more...</Button>
                    </td>
                  </tr>
                </ErrorBoundary>
              }
            </tbody>
          </Table>
        </React.Fragment>
      );
    }
}
