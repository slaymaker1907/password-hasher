import {hashPassword, PasswordHasher, defaultSalt, Entropy} from "./password.js";
import ReactDOM from "react-dom";
import React from "react";
import {Form, FormGroup, ControlLabel, FormControl, Checkbox, Panel, Alert, Row, Col, Button} from "react-bootstrap";
import Clipboard from "react-clipboard.js";

class PasswordField extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      checkPassword: false,
      password: '',
      password1: '',
    };
  }

  password1Changed(event) {
    this.setState({password1: event.target.value});
  }

  passwordChanged(event) {
    this.setState({password: event.target.value});
  }

  setState(state, func) {
    super.setState(state, () => {
      if (this.isValid) {
        this.props.onChange({target: {value: this.state.password}});
      }
    });
  }

  checkPasswordChanged(event) {
    this.setState({checkPassword: !this.state.checkPassword});
  }

  get isValid() {
    if (this.state.checkPassword) {
      return this.state.password === this.state.password1;
    } else {
      return true;
    }
  }

  render() {
    var otherPassword, errorMessage;

    if (this.state.checkPassword) {
      otherPassword = (
        <FormGroup controlId="password1">
          <ControlLabel>Password</ControlLabel>
          <FormControl type="password" placeholder="Repeat password" onChange={this.password1Changed.bind(this)}/>
        </FormGroup>
      );
    }

    if (!this.isValid) {
      errorMessage = (
        <Alert bsStyle="danger">
          <strong>Passwords mistmatch</strong>: please make sure that password fields are identical.
        </Alert>
      );
    }

    return (
        <div>{errorMessage}
          <FormGroup controlId="password">
            <ControlLabel>Password</ControlLabel>
            <FormControl type="password" placeholder="Master password" onChange={this.passwordChanged.bind(this)} />
          </FormGroup>
          {otherPassword}
          <Checkbox onChange={this.checkPasswordChanged.bind(this)}>
            Double check password
          </Checkbox>
        </div>
    );
  }
}

class PasswordForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      identifier: '',
      password: ''
    };
  }

  passwordChanged(event) {
    var pass = event.target.value;
    this.setState({password: pass});
    this.hashChanged(this.state.identifier, pass);
  }

  hashChanged(id, pass) {
    var hash = hashPassword(this.props.salt, id, pass);
    this.props.onChange({target: {value: hash}});
  }

  setState(newState, props) {
    super.setState(newState, props);
  }

  identifierChanged(event) {
    var id = event.target.value;
    this.setState({identifier: id});
    this.hashChanged(id, this.state.password);
  }

  render() {
    return (
        <div>
          <FormGroup controlId="identifier">
            <ControlLabel>Identifier</ControlLabel>
            <FormControl
              type="text"
              placeholder="Identifier"
              onChange={this.identifierChanged.bind(this)}
            />
          </FormGroup>
          <PasswordField onChange={this.passwordChanged.bind(this)} />
        </div>
    );
  }
}
PasswordForm.defaultProps = {
  salt: defaultSalt()
};

export default class HasherControl extends React.Component {
  constructor(props) {
    super(props);
    this.hasher = new PasswordHasher();
    this.state = {
      hashValue: null,
      hashType: 'special',
      maxLength: null,
      finalHash: null
    };
  }

  hashChanged(event) {
    this.setState({hashValue: event.target.value}, this.computeNewHash.bind(this));
  }

  hashTypeChanged(event) {
    this.setState({hashType: event.target.value}, this.computeNewHash.bind(this));
  }

  maxLengthChanged(event) {
    this.needUpdate = true;
    this.setState({maxLength: parseInt(event.target.value)}, this.computeNewHash.bind(this));
  }

  computeNewHash() {
    var hashValue = this.state.hashValue;
    if (hashValue) {
      var entropy = new Entropy(hashValue);
      var initBits = entropy.totalBits;
      var _this = this;
      this.hasher[this.state.hashType](entropy, this.state.maxLength).then((result) => {
        if (this.state.maxLength) {
          result = result.substring(0, this.state.maxLength);
        }
        var totalBits = initBits - entropy.totalBits;
        _this.setState({finalHash: {val: result, entropy: totalBits}});
      }, (err) => {
        console.log(err);
      });
    }
  }

  render() {

    var output;
    if (this.state.finalHash) {
      var outTitle = (<h5>Pasword Output</h5>);
      var entropyTitle = (<h5>Password Strength (Bits of Entropy)</h5>);
      output = (
        <div>
          <br />
          <Row>
            <Col xs={12}>
              <Panel header={outTitle} bsStyle="success">
                <p id="hashedPassword">{this.state.finalHash.val}</p>
                <Clipboard data-clipboard-text={this.state.finalHash.val} className="btn btn-default">Copy to clipboard.</Clipboard>
              </Panel>
              <Panel header={entropyTitle} bsStyle="info">
                <p>{this.state.finalHash.entropy}</p>
              </Panel>
            </Col>
          </Row>
        </div>
      );
    }

    return (
      <div>
        <Row>
          <Col xs={12}>
            <Form horizontal>
              <PasswordForm onChange={this.hashChanged.bind(this)} />
            </Form>
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <Form inline>
              <FormGroup controlId="hashType">
                <ControlLabel>Password type: </ControlLabel>
                <FormControl componentClass="select" value={this.state.hashType} onChange={this.hashTypeChanged.bind(this)}>
                  <option value="special">Special characters</option>
                  <option value="words">English words</option>
                  <option value="alphaNum">Alphanumeric</option>
                  <option value="numbers">Numbers</option>
                  <option value="hexidec">Hexidecimal</option>
                </FormControl>
              </FormGroup>
              <FormGroup controlId="maxLength">
                <ControlLabel>Max length: </ControlLabel>
                <FormControl type="number" min="1" onChange={this.maxLengthChanged.bind(this)}/>
              </FormGroup>
            </Form>
          </Col>
        </Row>
        {output}
      </div>
    );
  }
}

ReactDOM.render(<HasherControl />, document.getElementById('myApp'));
