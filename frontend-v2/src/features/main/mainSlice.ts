import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export enum PageName {
  PROJECTS = "Projects",
  DRUG = "Drug and Target",
  MODEL = "Model",
  DATA = "Data",
  TRIAL_DESIGN = "Trial Design",
  SIMULATIONS = "Simulations",
  HELP = "Help & Feedback",
}

export enum SubPageName {
  PKPDMODEL = "PK/PD Model",
  MAPVARIABLES = "Map Variables",
  PARAMETERS = "Parameters",
  TUTORIALS = "Tutorials",
  PROJECTS = "Projects",
  DRUG = "Drug",
  MODEL = "Model",
  TRAILDESIGN = "Trial Design",
  SIMULATION = "Simulation",
  LOAD_DATA = "Load Data",
  STRATIFICATION = "Stratification",
  VISUALISATION = "Visualisation",
}

interface MainState {
  selectedPage: PageName;
  selectedSubPage: SubPageName | null;
  selectedProject: number | null;
  dirtyCount: number;
}

const initialState: MainState = {
  selectedPage: PageName.PROJECTS,
  selectedSubPage: null,
  selectedProject: null,
  dirtyCount: 0,
};

const mainSlice = createSlice({
  name: "main",
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<PageName>) => {
      state.selectedPage = action.payload;
    },
    setSubPage: (state, action: PayloadAction<SubPageName | null>) => {
      state.selectedSubPage = action.payload;
    },
    setProject: (state, action: PayloadAction<number | null>) => {
      state.selectedProject = action.payload;
    },
    incrementDirtyCount: (state) => {
      state.dirtyCount += 1;
    },
    decrementDirtyCount: (state) => {
      state.dirtyCount -= 1;
    },
  },
});

export const {
  setPage,
  setSubPage,
  setProject,
  incrementDirtyCount,
  decrementDirtyCount,
} = mainSlice.actions;
export default mainSlice.reducer;
