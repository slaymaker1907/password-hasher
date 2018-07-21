import { createStore, applyMiddleware, Dispatch, Reducer, Action, compose } from "redux";
import ReduxThunk from "redux-thunk";
import { persistMiddleware, persistActionType } from "./persist";
import { hashPassword, entropy, Range, ranges, selectFrom, MaxEntropy, specialRange } from "./password";
import { createSelector, createStructuredSelector } from "reselect";
import { BigInteger } from "big-integer";
import bigInt = require("big-integer");
import { composeWithDevTools } from "redux-devtools-extension";
import * as _ from "lodash";

let allRanges: Range[] = [];

function rangeFromName(name: string): Range {
    return _.defaultTo(_.find(allRanges, { name }), specialRange);
}

declare const process: {
    env?: string;
};

export enum ActionType {
    Computed = "COMPUTED",
    Range = "RANGE",
    Size = "SIZE",
    DisplayPassword = "DISPLAY_PASSWORD"
}

interface IdHistoryValue {
    range: string;
    sizeLimit?: number;
}

const defaultIdHistoryValue: IdHistoryValue = {
    range: specialRange.name
};

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

let changePasswordId = 0;
export const changePassword = (password: string, id: string) => async (dispatch: Dispatch<State>, getState: () => State) => {
    changePasswordId++;
    const myId = changePasswordId;

    const oldState = getState();

    const result: ComputedAction = {
        payload: {
            generated: bigInt(0),
            password,
            passwordId: id,
        },
        type: ActionType.Computed
    };
    dispatch(result);

    const hist = _.defaultTo(oldState.idHistory[id], defaultIdHistoryValue);
    dispatch(changeSize(hist.sizeLimit));
    dispatch(changeRange(rangeFromName(hist.range)));
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

function idHistoryReducer(state: State, action: any) {
    const passwordId = state.passwordId;
    const oldIdHistory = _.defaultTo(state.idHistory[passwordId], defaultIdHistoryValue);
    let newState = state;

    if (action.type === ActionType.Range) {
        const realAction: RangeAction = action;
        newState = {
            ...state,
            idHistory: {
                ...state.idHistory,
                [passwordId]: {
                    ...oldIdHistory,
                    range: realAction.payload.range.name
                }
            }
        };
    } else if (action.type === ActionType.Size) {
        const realAction: SizeAction = action;
        newState = {
            ...state,
            idHistory: {
                ...state.idHistory,
                [passwordId]: {
                    ...oldIdHistory,
                    sizeLimit: realAction.payload
                }
            }
        };
    }

    return newState;
}

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
    idHistory: {
        [id: string]: IdHistoryValue;
    };
}

export const persistSelector = createStructuredSelector({
    password: _.property("password"),
    idHistory: _.property("idHistory"),
    selectedRange: _.property("selectedRange.name"),
    sizeLimit: _.property("sizeLimit"),
    passwordId: _.property("passwordId")
});

export function persistReducer(oldState: State, action: any) {
    if (action.type === persistActionType) {
        return {
            ...oldState,
            ...action.payload
        };
    } else {
        return oldState;
    }
}

export async function makeStore() {
    allRanges = await ranges;
    const initial: State = {
        password: "",
        passwordId: "",
        generated: bigInt.zero,
        ranges: allRanges,
        selectedRange: allRanges[0],
        showPassword: false,
        idHistory: {}
    };
    const rootReducer = composeReducers(computeReducer, rangeReducer, sizeReducer, displayPasswordReducer, persistReducer, idHistoryReducer);
    const composer: any = process.env === "production" ? compose : composeWithDevTools;
    const middleware = composer(applyMiddleware(ReduxThunk, persistMiddleware(persistSelector)));
    const store = createStore(rootReducer, initial, middleware);
    const firstState = store.getState(); // Need to do this in case middleware do a dispatch.
    store.dispatch(changePassword(firstState.password, firstState.passwordId));
    return store;
}

