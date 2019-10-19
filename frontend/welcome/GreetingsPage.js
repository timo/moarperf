import React from 'react';
import { Button, CardDeck, Card, CardTitle, CardText, Row, Col } from 'reactstrap';
import CodeEditor from './CodeEditor';

export default class GreetingsPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      interest: 'everything',
      step: 'start',
      profileKind: 'measurePerformance',
    };
  }

  render() {
    const props = this.props;

    const
      buttonStyle = {
        padding: '1em',
        border: '1px solid black',
      };
    const
      currentButtonStyle = {
        padding: '1em',
        border: '1px solid darkblue',
        background: 'lightblue',
      };
    const
      iconStyle = {
        display: 'block',
      };
    const
      greetingsPanelStyle = {
        display: 'grid',
        gridTemplateAreas:
                    `"leftPanel leftPanel rightPanel"
                    "leftPanel leftPanel ."
                    "confirmation confirmation confirmation"
                    "bottomPanel bottomPanel bottomPanel"`,
        gridTemplateColumns: '1fr 1fr 1fr',
      };
    const
      interestPanelStyle = {
        gridArea: 'rightPanel',
        margin: '1em',
      };
    const
      intentPanelStyle = {
        gridArea: 'leftPanel',
        margin: '1em',
        display: 'grid',
        gridGap: '1em',
      };

    const
      IconButton = (buttonProps) => {
        const isSelected = this.state.profileKind === buttonProps.selectionValue;
        return (<button
          style={{ ...(isSelected ? currentButtonStyle : buttonStyle), ...buttonProps.buttonStyle }}
          onClick={() => this.setState({ profileKind: buttonProps.selectionValue })}
        >
          <i style={iconStyle} className={`fas fa-2x fa-${buttonProps.name}`} />
          {buttonProps.children}
        </button>);
      };

    const isIntentShown = () => this.state.step === 'start';

    const
      LeftPanel = (props) => {
          return isIntentShown() ?
              (<Col xs={9}><h1>I would like to
                  ...
              </h1>
                  <CardDeck>
                      <Card body>
                          <CardTitle>Measure performance</CardTitle>
                          <CardText>Run Perl 6 code and measure performance.</CardText>
                          <IconButton
                                name="hourglass-half"
                                buttonStyle={{gridArea: '1 / 0'}}
                                selectionValue="measurePerformance"
                                />
                      </Card>
                      <Card body>
                          <CardTitle>Measure memory usage</CardTitle>
                          <CardText>Run Perl 6 code and measure memory usage.</CardText>
                          <IconButton name="microchip" buttonStyle={{gridArea: '2 / 0'}} selectionValue="measureMemory"></IconButton>
                      </Card>
                    <Card body>
                        <CardTitle>Analyze results</CardTitle>
                        <CardText>Open the result file from an earlier run for inspection</CardText>
                        <IconButton name="file-alt" buttonStyle={{gridArea: '3 / 0'}} selectionValue="loadProfile"></IconButton>
                    </Card>
                  </CardDeck>
              </Col>)
              : (<Col>Nope</Col>);
      };
    const handleRadioClick = event => this.setState({ interest: event.target.value });
    return [
        <Row key={0}>
            <LeftPanel />
        <Col xs={3}><h2>I am interested in ...</h2>
          <div><input type="radio" value="usercode" checked={this.state.interest === 'usercode'} onChange={handleRadioClick} />the performance of my program</div>
          <div><input type="radio" value="corecode" checked={this.state.interest === 'corecode'} onChange={handleRadioClick} />the performance of rakudo</div>
          <div><input type="radio" value="everything" checked={this.state.interest === 'everything'} onChange={handleRadioClick} />all available data</div>
        </Col></Row>,
        <Row key={1}><Col>
          <CodeEditor />
        </Col></Row>];
  }
}
