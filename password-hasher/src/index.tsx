import "../style/main.scss";
// import "material-components-web";

import React = require("react");
import { FormEvent, ReactNode } from "react";
import { render } from "react-dom";
import { connect, Provider } from "react-redux";
import { Dispatch } from "redux";
import {
    makeStore, State, changePassword, computePassword,
    changeRange, changeSize, ActionType
} from "./store";
import { Range } from "./password";
import Clipboard = require("clipboard");

import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import TextField from "material-ui/TextField";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";
import RaisedButton from "material-ui/RaisedButton";

import injectTapEventPlugin = require("react-tap-event-plugin");
import * as _ from "lodash";
injectTapEventPlugin();

interface PasswordProps {
    password: string;
    passwordId: string;
    output: string;
    outputSize: number;
    changePassword: (password: string, id: string) => any;
    entropy: number;
    ranges: Range[];
    selectedRange: Range;
    selectRange: (range: Range) => any;
    sizeLimit?: number;
    changeSize: (size: number) => any;
    showPassword: boolean;
    showHidePassword: () => any;
}

function Input(label: string, value: string, onChange: (e: FormEvent<HTMLInputElement>) => any, type?: string) {
    const typ = type ? type : "text";
    return [
        <TextField type={typ} hintText={label} className="data" onChange={onChange} value={value} />
    ];
};


function eventValue(event: FormEvent<HTMLInputElement>) {
    return event.currentTarget.value;
}

function OutputDisplay(name: string, value: ReactNode) {
    return [
        <div className="label">{name}:</div>,
        <div className="data">{value}</div>
    ];
}

new Clipboard("#copy-password");
function PasswordHasher(props: PasswordProps) {
    const passChange = _.flow(eventValue, password => props.changePassword(password, props.passwordId));
    const idChange = _.flow(eventValue, _.partial(props.changePassword, props.password));
    const sizeChange = _.flow(eventValue, parseInt, props.changeSize);
    const sizeLimit = props.sizeLimit ? props.sizeLimit.toString() : "";
    const password = props.showPassword ? props.output : props.output.replace(/./g, "*");
    const passMess = props.showPassword ? "Hide password" : "Show password";
    const selectOptions = props.ranges.map(range => <MenuItem value={range} primaryText={range.name} />);
    return (
        <div id="hasher">
            <div id="input-fields">
                {Input("Password", props.password, passChange, "password")}
                {Input("Identifier", props.passwordId, idChange)}
                {Input("Size Limit", sizeLimit, sizeChange, "number")}
            </div>
            <SelectField value={props.selectedRange} floatingLabelText="Output Type" onChange={_.rearg(props.selectRange, [2]) as any}>
                {selectOptions}
            </SelectField>
            <div id="output">
                {OutputDisplay("Output", password)}
                <RaisedButton primary data-clipboard-text={props.output} label="Copy to clipboard" />
                <RaisedButton secondary label={passMess} onClick={props.showHidePassword} />
                {OutputDisplay("Output Size", props.outputSize)}
                {OutputDisplay("Entropy", props.entropy)}
            </div>
        </div>
    );
}

function mapStateToProps(state: State) {
    const [output, entropy] = computePassword(state);
    return {
        ...state,
        entropy,
        output: output.join(""),
        outputSize: output.length
    };
}

function mapDispatchToProps(dispatch: Dispatch<State>) {
    const compDisp = _.partial(_.flowRight, dispatch);
    return {
        changePassword: compDisp(changePassword),
        selectRange: compDisp(changeRange),
        changeSize: compDisp(changeSize),
        showHidePassword: _.partial(dispatch, { type: ActionType.DisplayPassword }) as () => any
    };
}

function Main() {
    const Index = connect(mapStateToProps, mapDispatchToProps)(PasswordHasher);
    return (
        <MuiThemeProvider>
            <Index />
        </MuiThemeProvider>
    );
}

makeStore().then(store => {
    render(<Provider store={store}><Main /></Provider>, document.getElementById("app"));
});
