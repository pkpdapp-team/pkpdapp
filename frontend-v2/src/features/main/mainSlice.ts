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
}

const initialState: MainState = {
  selectedPage: PageName.PROJECTS,
  selectedProject: null,
};

const mainSlice = createSlice({
  name: 'main',
  initialState,
  reducers: {
    selectPage: (state, action: PayloadAction<PageName>) => {
      state.selectedPage = action.payload;
    },
    selectProject: (state, action: PayloadAction<number>) => {
      state.selectedProject = action.payload;
    }
  },
});

export const { selectPage, selectProject } = mainSlice.actions;
export default mainSlice.reducer;
