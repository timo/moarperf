import * as ActionTypes from './actions';

const initialState = {
    tipText: '',
    latestTips: []
};
export function tipsyReducer(state = initialState, action) {
    switch (action.type) {
        case ActionTypes.CHANGE_TIP_TEXT:
            return { ...state, tipText: action.text };
        case ActionTypes.ADD_TIP:
            return { ...state, tipText: '' };
        case ActionTypes.LATEST_TIP: {
            let tip = { id: action.id, text: action.text };
            return {
                ...state,
                latestTips: [tip, ...state.latestTips]
            };
        }
        default:
            return state;
    }
}
