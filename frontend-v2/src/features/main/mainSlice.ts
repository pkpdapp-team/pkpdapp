import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export enum PageName {
  PROJECTS = 'Projects',
  DRUG = 'Drug',
  MODEL = 'Model',
  DATA = 'Data',
  TRIAL_DESIGN = 'Trial Design',
  SIMULATIONS = 'Simulations',
}

interface MainState {
  selectedPage: PageName;
  selectedProject: number | null;
  dirtyCount: number;
}

const initialState: MainState = {
  selectedPage: PageName.PROJECTS,
  selectedProject: null,
  dirtyCount: 0,
};

const mainSlice = createSlice({
  name: 'main',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<PageName>) => {
      state.selectedPage = action.payload;
    },
    setProject: (state, action: PayloadAction<number>) => {
      state.selectedProject = action.payload;
    },
    incrementDirtyCount: (state) => {
      state.dirtyCount += 1;
    },
    decrementDirtyCount: (state) => {
      state.dirtyCount -= 1;
    }
  },
});

export const { setPage, setProject, incrementDirtyCount, decrementDirtyCount} = mainSlice.actions;
export default mainSlice.reducer;
