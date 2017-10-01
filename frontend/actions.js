import $ from 'jquery';

export const CHANGE_TIP_TEXT = 'CHANGE_TIP_TEXT';
export const ADD_TIP = 'ADD_TIP';
export const LATEST_TIP = 'LATEST_TIP';
export const UPDATE_TOP_TIPS = 'UPDATE_TOP_TIPS';
export const AGREE = 'AGREE';
export const DISAGREE = 'DISAGREE';

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
export function agree(id) {
    return dispatch => {
        $.ajax({
            url: '/tips/' + id + '/agree',
            type: 'POST',
            success: () => dispatch({ type: AGREE, id })
        });
    };
}
export function disagree(id) {
    return dispatch => {
        $.ajax({
            url: '/tips/' + id + '/disagree',
            type: 'POST',
            success: () => dispatch({ type: DISAGREE, id })
        });
    };
}
