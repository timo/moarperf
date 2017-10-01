import * as ActionTypes from './actions';

const initialState = {
    tipText: ''
};
export function tipsyReducer(state = initialState, action) {
    switch (action.type) {
        case ActionTypes.CHANGE_TIP_TEXT:
            return { ...state, tipText: action.text };
        case ActionTypes.ADD_TIP:
            return { ...state, tipText: '' };
        default:
            return state;
    }
}
