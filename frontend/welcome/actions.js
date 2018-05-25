import $ from 'jquery';

export const CHANGE_FILE_PATH = 'CHANGE_FILE_PATH';
export const FILE_REQUESTED = 'FILE_REQUESTED';

type ChangeFilePathAction = { type : "CHANGE_FILE_PATH", path: string };
type RequestFileAction = { type : "REQUEST_FILE", filetype: string };

export type WelcomeAction = ChangeFilePathAction |
                            RequestFileAction;

export function changeFilePath(path : string) : ChangeFilePathAction {
  return { type: CHANGE_FILE_PATH, path };
}

export function requestFile() : RequestFileAction {
  return (dispatch, getState) => {
    $.ajax({
      url: '/load-file',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ path: getState().welcome.filePath }),
      success: ({ filetype }) => dispatch({ type: FILE_REQUESTED, filetype }),
    });
  };
}
