import { MiddlewareAPI, Dispatch } from "redux";
import { Selector } from "reselect";

export const persistActionType = "PERSIST_DB/INIT";
export const persistDBName = "PERSIST_DB";

export type MiddlewareType<StoreT> = (store: MiddlewareAPI<StoreT>) => (next: Dispatch<StoreT>) => Dispatch<StoreT>;

export interface PersistAction<R> {
    type: "PERSIST_DB/INIT"; payload: R;
}

export const persistMiddleware: <StoreT, R>(selector: Selector<StoreT, R>) => MiddlewareType<StoreT> = selector => store => {
    const oldData = window.localStorage.getItem(persistDBName);
    if (oldData) {
        store.dispatch({
            type: persistActionType,
            payload: JSON.parse(oldData)
        });
    }

    let lastState = selector(store.getState());

    return next => (action: any) => {
        const result = next(action);

        const newState = selector(store.getState());
        if (newState !== lastState) {
            lastState = newState;
            window.localStorage.setItem(persistDBName, JSON.stringify(newState));
        }

        return result;
    };
};
