import React from 'react';
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
        paddingBottom: '0.5em',
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
          <i style={iconStyle} className={`fas fa-${4 + isSelected}x fa-${buttonProps.name}`} />
          {buttonProps.children}
        </button>);
      };

    const isIntentShown = () => this.state.step === 'start';

    const
      leftPanel = isIntentShown() ?
        (<div id="intentPanel" style={intentPanelStyle}><h1 style={{ gridArea: 'auto / span 3' }}>I would like to
                    ...
        </h1>
          <IconButton
            name="hourglass-half"
            buttonStyle={{ gridArea: '1 / 0' }}
            selectionValue="measurePerformance"
          >
                        Run a program and measure performance
          </IconButton>
          <IconButton name="microchip" buttonStyle={{ gridArea: '2 / 0' }} selectionValue="measureMemory">
                        Run a program and measure memory usage
          </IconButton>
          <IconButton name="file-alt" buttonStyle={{ gridArea: '3 / 0' }} selectionValue="loadProfile">
                        Analyze the results of a profiler run
          </IconButton>
        </div>)
        : <div>Nope</div>;
    const handleRadioClick = event => this.setState({ interest: event.target.value });
    return (
      <div style={greetingsPanelStyle}>
        {leftPanel}
        <div style={interestPanelStyle}><h1>I am interested in ...</h1>
          <div><input type="radio" value="usercode" checked={this.state.interest == 'usercode'} onChange={handleRadioClick} />the performance of my program</div>
          <div><input type="radio" value="corecode" checked={this.state.interest == 'corecode'} onChange={handleRadioClick} />the performance of rakudo</div>
          <div><input type="radio" value="everything" checked={this.state.interest == 'everything'} onChange={handleRadioClick} />all available data</div>
        </div>
        <div style={{ gridArea: 'bottomPanel' }}>
          <CodeEditor />
        </div>
      </div>);
  }
}
