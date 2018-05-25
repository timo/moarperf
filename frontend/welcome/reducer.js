import type { WelcomeAction } from './actions';
import * as ActionTypes from './actions';

export type WelcomeState = {
    +filePath: string,
    +frontendMode: string,
}

const initialState : WelcomeState = {
  filePath: '',
  frontendMode: "welcome",
};
export default function welcomeReducer(
  state : WelcomeState = initialState,
  action : WelcomeAction,
) : WelcomeState {
  switch (action.type) {
    case ActionTypes.CHANGE_FILE_PATH: {
      return { ...state, filePath: action.path };
    }
    case ActionTypes.FILE_REQUESTED: {
      return {
        ...state,
        frontendMode: action.filetype === 'profile'
          ? 'profile'
          : 'heapsnapshot'
      };
    }
    default:
      return { ...state };
  }
}
