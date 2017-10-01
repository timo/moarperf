export const CHANGE_TIP_TEXT = 'CHANGE_TIP_TEXT';
export const ADD_TIP = 'ADD_TIP';

export function changeTipText(text) {
    return { type: CHANGE_TIP_TEXT, text };
}
export function addTip() {
    return { type: ADD_TIP };
}
