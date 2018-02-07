import { createStore, applyMiddleware, Dispatch, Reducer, Action, compose } from "redux";
import ReduxThunk from "redux-thunk";
import { hashPassword, entropy, Range, ranges, selectFrom, MaxEntropy } from "./password";
import { createSelector } from "reselect";
import { BigInteger } from "big-integer";
import bigInt = require("big-integer");
import { composeWithDevTools } from "redux-devtools-extension";

declare const process: {
    env?: string;
};

export enum ActionType {
    Computed = "COMPUTED",
    Range = "RANGE",
    Size = "SIZE",
    DisplayPassword = "DISPLAY_PASSWORD"
}

export const computePassword = createSelector(
    (state: State) => state.generated,
    (state: State) => state.selectedRange!,
    (state: State) => state.sizeLimit,
    (generated, range, sizeLimit): [string[], number] => {
        let num = generated;
        let result = [];
        while (num.compare(bigInt.zero) > 0) {
            let temp;
            [num, temp] = selectFrom(num, range);
            result.push(temp);
            if (sizeLimit && result.length >= sizeLimit) {
                break;
            }
        }
        return [
            result,
            MaxEntropy - entropy(num),
        ];
    });

interface ComputedAction extends Action {
    payload: {
        password: string;
        passwordId: string;
        generated: BigInteger;
    };
    type: ActionType.Computed;
}

interface SizeAction extends Action {
    payload?: number;
    type: ActionType.Size;
}

interface RangeAction extends Action {
    payload: {
        range: Range;
    };
    type: ActionType.Range;
}

let changePasswordId = 0;
export const changePassword = (password: string, id: string) => async (dispatch: Dispatch<State>) => {
    changePasswordId++;
    const myId = changePasswordId;

    const result: ComputedAction = {
        payload: {
            generated: bigInt(0),
            password,
            passwordId: id,
        },
        type: ActionType.Computed
    };
    dispatch(result);
    try {
        const generated = await hashPassword(id, password);
        if (changePasswordId !== myId) {
            // Early return since our result has been invalidated.
            return;
        }
        const nextResult = {
            ...result,
            payload: {
                ...result.payload,
                generated
            }
        };
        dispatch(nextResult);
    } catch (err) {
        console.error(`Could not compute password: ${err}`);
    }
};

export const changeRange = (range: Range) => {
    const result = {
        type: ActionType.Range,
        payload: {
            range
        }
    };
    return result;
};

export const changeSize = (size?: number): SizeAction => {
    return {
        type: ActionType.Size,
        payload: size
    };
};

function filterType<S>(actionType: ActionType, reducer: Reducer<S>): Reducer<S> {
    return (state, action) => action.type === actionType ? reducer(state, action) : state;
}

const computeReducer = filterType(ActionType.Computed, function(state: State, action: ComputedAction) {
    const payload = action.payload;
    return {
        ...state,
        ...payload
    };
});

const rangeReducer = filterType(ActionType.Range, function(state: State, action: RangeAction) {
    return {
        ...state,
        selectedRange: action.payload.range
    };
});

const sizeReducer = filterType(ActionType.Size, function(state: State, action: SizeAction) {
    return {
        ...state,
        sizeLimit: action.payload
    };
});

const displayPasswordReducer = filterType(ActionType.DisplayPassword,
    function(state: State) {
        return {
            ...state,
            showPassword: !state.showPassword
        };
    });

function composeReducers<S>(...reducers: Reducer<S>[]): Reducer<S> {
    return (oldState, action) => reducers.reduce((state, reducer) => reducer(state, action), oldState);
}

export interface State {
    password: string;
    passwordId: string;
    generated: BigInteger;
    ranges: Range[];
    selectedRange: Range;
    sizeLimit?: number;
    showPassword: boolean;
}

export async function makeStore() {
    const waitRanges = await ranges;
    const initial: State = {
        password: "",
        passwordId: "",
        generated: bigInt.zero,
        ranges: waitRanges,
        selectedRange: waitRanges[0],
        showPassword: false
    };
    const rootReducer = composeReducers(computeReducer, rangeReducer, sizeReducer, displayPasswordReducer);
    const composer = process.env === "production" ? compose : composeWithDevTools;
    const store = createStore(rootReducer, initial, composer(applyMiddleware(ReduxThunk)));
    store.dispatch(changePassword("", ""));
    return store;
}

