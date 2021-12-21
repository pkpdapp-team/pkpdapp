import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
} from "@reduxjs/toolkit";

import { api } from "../../Api";

const basePkModelsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id,
});

const initialState = basePkModelsAdapter.getInitialState({
  status: "idle",
  error: null,
});

export const fetchBasePkModels = createAsyncThunk(
  "basePkModels/fetchBasePkModels",
  async () => {
    const response = await api.get(`/api/pharmacokinetic/`);
    return response;
  }
);

export const basePkModelsSlice = createSlice({
  name: "basePkModels",
  initialState,
  reducers: {},
  extraReducers: {
    [fetchBasePkModels.pending]: (state, action) => {
      state.status = "loading";
    },
    [fetchBasePkModels.rejected]: (state, action) => {
      state.status = "failed";
      state.error = action.error.message;
    },
    [fetchBasePkModels.fulfilled]: (state, action) => {
      state.status = "succeeded";
      basePkModelsAdapter.setAll(state, action.payload);
    },
  },
});

// export const {} = basePkModelsSlice.actions

export default basePkModelsSlice.reducer;

export const {
  selectAll: selectAllBasePkModels,
  selectById: selectBasePkModelById,
  selectIds: selectBasePkModelIds,
} = basePkModelsAdapter.getSelectors((state) => state.basePkModels);
