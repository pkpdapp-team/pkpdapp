import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
} from "@reduxjs/toolkit";

import { api } from "../../Api";
import { fetchVariablesByPkpdModel } from "../variables/variablesSlice";
import { fetchUnitsByPkpdModel } from "../projects/unitsSlice";

export const pkpdModelsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id,
});

const initialState = pkpdModelsAdapter.getInitialState({
  status: "idle",
  error: null,
});

export const fetchPkpdModels = createAsyncThunk(
  "pkpdModels/fetchPkpdModels",
  async (project, { dispatch }) => {
    const response = await api.get(
      `/api/pkpd_model/?project_id=${project.id}`
    );
    for (var i = 0; i < response.length; i++) {
      if (!response[i].read_only) {
        dispatch(fetchVariablesByPkpdModel(response[i].id));
        dispatch(fetchUnitsByPkpdModel(response[i].id));
        dispatch(fetchPkpdModelSimulateById(response[i].id));
      }
    }
    return response;
  }
);

export const fetchPkpdModelById = createAsyncThunk(
  "pkpdModels/fetchPkpdModelById",
  async (model_id, { dispatch }) => {
    let response = await api.get(`/api/pkpd_model/${model_id}/`);
    dispatch(fetchPkpdModelSimulateById(response.id));
    dispatch(fetchVariablesByPkpdModel(response.id));
    dispatch(fetchUnitsByPkpdModel(response.id));
    return response;
  }
);

export const fetchPkpdModelSimulateById = createAsyncThunk(
  "pkpdModels/fetchPkpdModelSimulateById",
  async (model_id, { dispatch }) => {
    const response = await api.post(
      `/api/pkpd_model/${model_id}/simulate`
    );
    return response;
  }
);

export const deletePkpdModel = createAsyncThunk(
  "pkpdModels/deletePkpdModel",
  async (pkpdModelId, { dispatch }) => {
    await api.delete(`/api/pkpd_model/${pkpdModelId}`);
    return pkpdModelId;
  }
);

export const addNewPkpdModel = createAsyncThunk(
  "pkpdModels/addNewPkpdModel",
  async (project, { dispatch }) => {
    const initialPkpdModel = {
      name: "new",
      project: project.id,
      mappings: [],
    };
    let pkpdModel = await api.post("/api/pkpd_model/", initialPkpdModel);
    dispatch(fetchVariablesByPkpdModel(pkpdModel.id));
    dispatch(fetchUnitsByPkpdModel(pkpdModel.id));
    dispatch(fetchPkpdModelSimulateById(pkpdModel.id));
    pkpdModel.chosen = true;
    return pkpdModel;
  }
);

export const updatePkpdModel = createAsyncThunk(
  "pkpdModels/updatePkpdModel",
  async (pkpdModel, { dispatch }) => {
    let newPkpdModel = await api.put(
      `/api/pkpd_model/${pkpdModel.id}/`,
      pkpdModel
    );
    dispatch(fetchVariablesByPkpdModel(newPkpdModel.id));
    dispatch(fetchUnitsByPkpdModel(newPkpdModel.id));
    dispatch(fetchPkpdModelSimulateById(newPkpdModel.id));
    return newPkpdModel;
  }
);

export const pkpdModelsSlice = createSlice({
  name: "pkpdModels",
  initialState,
  reducers: {
    togglePkpdModel(state, action) {
      let pkpdModel = state.entities[action.payload.id];
      pkpdModel.chosen = !pkpdModel.chosen;
    },
    addPkpdModels: pkpdModelsAdapter.upsertMany,
  },
  extraReducers: {

    [fetchPkpdModels.pending]: (state, action) => {
      state.status = "loading";
    },
    [fetchPkpdModels.rejected]: (state, action) => {
      state.status = "failed";
      state.error = action.error.message;
    },
    [fetchPkpdModels.fulfilled]: (state, action) => {
      state.status = "succeeded";
      pkpdModelsAdapter.setAll(state, action.payload);
    },
    [deletePkpdModel.fulfilled]: pkpdModelsAdapter.removeOne,
    [fetchPkpdModelById.fulfilled]: pkpdModelsAdapter.upsertOne,
    [fetchPkpdModelSimulateById.pending]: (state, action) => {
      if (state.ids.includes(action.meta.arg)) {
        state.entities[action.meta.arg].simulate = {
          status: "loading",
        };
      }
    },
    [fetchPkpdModelSimulateById.fulfilled]: (state, action) => {
      if (state.ids.includes(action.meta.arg)) {
        state.entities[action.meta.arg].simulate = {
          ...action.payload,
          status: "succeeded",
        };
      }
    },
    [fetchPkpdModelSimulateById.rejected]: (state, action) => {
      if (state.ids.includes(action.meta.arg)) {
        state.entities[action.meta.arg].simulate = {
          status: "failed",
        };
      }
    },
    [addNewPkpdModel.rejected]: (state, action) =>
      console.log(action.error.message),
    [addNewPkpdModel.fulfilled]: pkpdModelsAdapter.addOne,
    [updatePkpdModel.fulfilled]: pkpdModelsAdapter.upsertOne,
  },
});

export const { togglePkpdModel, addPkpdModels } = pkpdModelsSlice.actions;

export default pkpdModelsSlice.reducer;

export const {
  selectAll: selectAllPkpdModels,
  selectById: selectPkpdModelById,
  selectIds: selectPkpdModelIds,
} = pkpdModelsAdapter.getSelectors((state) => state.pkpdModels);

export const selectChosenPkpdModels = (state) =>
  selectAllPkpdModels(state).filter((pkpdModel) => pkpdModel.chosen);

export const selectWritablePkpdModels = (state) => {
  return selectAllPkpdModels(state).filter((pkpdModel) => !pkpdModel.read_only);
}

export const selectReadOnlyPkpdModels = (state) =>
  selectAllPkpdModels(state).filter((pkpdModel) => pkpdModel.read_only);

