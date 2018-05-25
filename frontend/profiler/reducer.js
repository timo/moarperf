export type ProfilerState = {
    +modelState: string,
    +routines: Array<any>
}

const initialState = {
  modelState: 'pre-load',
  routines: [],
  filePath: '',
};
export default function profilerReducer(
  state : ProfilerState = initialState,
  action : ActionTypes.ProfilerAction,
) : ProfilerState {
    console.log('got a profiler datum to reduce');
    switch (action.type) {
        case 'STATUS_UPDATE': {
            //if (action.body.hasOwnProperty("routineOverview

            return { ...state }
        }
    }
    return state;
}
