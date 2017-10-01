import $ from 'jquery';

export const CHANGE_TIP_TEXT = 'CHANGE_TIP_TEXT';
export const ADD_TIP = 'ADD_TIP';
export const LATEST_TIP = 'LATEST_TIP';

export function changeTipText(text) {
    return { type: CHANGE_TIP_TEXT, text };
}
export function addTip() {
    return (dispatch, getState) => {
        $.ajax({
            url: '/tips',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ text: getState().tipText }),
            success: () => dispatch({ type: ADD_TIP })
        });
    };
}
