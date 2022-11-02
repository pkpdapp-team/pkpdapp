import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
} from "@reduxjs/toolkit";

import { api } from "../../Api";
import { fetchVariablesByPkModel } from "../variables/variablesSlice";
import { setSelected } from "../modelling/modellingSlice";
import { fetchUnitsByPkModel } from "../projects/unitsSlice";

export const pkModelsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id,
});

const initialState = pkModelsAdapter.getInitialState({
  status: "idle",
  error: null,
});

export const fetchPkModels = createAsyncThunk(
  "pkModels/fetchPkModels",
  async (project_id, { dispatch, getState }) => {
    const response = await api.get(
      `/api/dosed_pharmacokinetic/?project_id=${project_id}`, getState().login.csrf
    );
    for (var i = 0; i < response.length; i++) {
      if (!response[i].read_only) {
        dispatch(fetchPkModelSimulateById(response[i].id));
      }
    }
    return response;
  }
);

export const fetchPkModelById = createAsyncThunk(
  "pkModels/fetchPkModelById",
  async (model_id, { dispatch, getState }) => {
    let response = await api.get(`/api/dosed_pharmacokinetic/${model_id}/`, getState().login.csrf);
    dispatch(fetchVariablesByPkModel(response.id));
    dispatch(fetchUnitsByPkModel(response.id));
    dispatch(fetchPkModelSimulateById(response.id));
    return response;
  }
);

export const fetchPkModelSimulateById = createAsyncThunk(
  "pkModels/fetchPkModelSimulateById",
  async (model_id, { dispatch, getState }) => {
    const response = await api.post(
      `/api/dosed_pharmacokinetic/${model_id}/simulate`, getState().login.csrf
    );
    return response;
  }
);

export const setPkVariablesByInference = createAsyncThunk(
  "pkModels/setVariablesByInference",
  async ({ id, inference_id}, { rejectWithValue, dispatch, getState }) => {
    const pkModel = await api.put(`/api/dosed_pharmacokinetic/${id}/set_variables_from_inference/`, getState().login.csrf, { inference_id });
    dispatch(fetchVariablesByPkModel(pkModel.id));
    dispatch(fetchPkModelSimulateById(pkModel.id));
    return pkModel;
  }
);

export const deletePkModel = createAsyncThunk(
  "pkModels/deletePkModel",
  async (pkModelId, { dispatch, getState }) => {
    let { modelling } = getState() 
    if (modelling.selectedType === 'pk_model' && modelling.selectedId === pkModelId) {
      await dispatch(setSelected({id: null, type: null}))
    }
    await api.delete(`/api/dosed_pharmacokinetic/${pkModelId}`, getState().login.csrf);
    return pkModelId;
  }
);

export const addNewPkModel = createAsyncThunk(
  "pkModels/addNewPkModel",
  async (project, { dispatch, getState }) => {
    const initialPkModel = {
      name: "new",
      project: project.id,
      mappings: [],
    };
    let pkModel = await api.post("/api/dosed_pharmacokinetic/", getState().login.csrf, initialPkModel);
    dispatch(fetchVariablesByPkModel(pkModel.id));
    dispatch(fetchUnitsByPkModel(pkModel.id));
    dispatch(fetchPkModelSimulateById(pkModel.id));
    return pkModel;
  }
);

export const updatePkModel = createAsyncThunk(
  "pkModels/updatePkModel",
  async (pkModel, { dispatch, getState }) => {
    let newPkModel = await api.put(
      `/api/dosed_pharmacokinetic/${pkModel.id}/`, getState().login.csrf,
      pkModel
    );
    // an update could create new variables
    dispatch(fetchVariablesByPkModel(newPkModel.id));
    dispatch(fetchUnitsByPkModel(newPkModel.id));
    dispatch(fetchPkModelSimulateById(newPkModel.id));
    //const simulateData = {
    //  outputs: pkModel.outputs.filter(x => x.default_value).map(x => x.name),
    //  initial_conditions: pkModel.outputs.reduce((o, x) => ({...o, x.name: x.default_value}), {}),
    //  variables: pkModel.variables.reduce((o, x) => ({...o, x.name: x.default_value}), {}),
    //}
    //const result = await api.post(
    //  `/api/dosed_pharmacokinetic/${pkModel.id}/simulate`, simulateData
    //)
    //return { ...newPkModel, simulate: result }
    return newPkModel;
  }
);

export const pkModelsSlice = createSlice({
  name: "pkModels",
  initialState,
  reducers: {
    togglePkModel(state, action) {
      let pkModel = state.entities[action.payload.id];
      pkModel.chosen = !pkModel.chosen;
    },
    setSelectPkModel(state, action) {
      let pkModel = state.entities[action.payload.id];
      pkModel.selected = action.payload.select;
    },
    addPkModels: pkModelsAdapter.upsertMany,
  },
  extraReducers: {

    [fetchPkModels.pending]: (state, action) => {
      state.status = "loading";
    },
    [fetchPkModels.rejected]: (state, action) => {
      state.status = "failed";
      state.error = action.error.message;
    },
    [fetchPkModels.fulfilled]: (state, action) => {
      state.status = "succeeded";
      pkModelsAdapter.setAll(state, action.payload);
    },
    [deletePkModel.fulfilled]: pkModelsAdapter.removeOne,
    [fetchPkModelById.fulfilled]: pkModelsAdapter.upsertOne,
    [fetchPkModelSimulateById.pending]: (state, action) => {
      if (state.ids.includes(action.meta.arg)) {
        state.entities[action.meta.arg].simulate = {
          status: "loading",
        };
      }
    },
    [fetchPkModelSimulateById.fulfilled]: (state, action) => {
      if (state.ids.includes(action.meta.arg)) {
        state.entities[action.meta.arg].simulate = {
          ...action.payload,
          status: "succeeded",
        };
      }
    },
    [fetchPkModelSimulateById.rejected]: (state, action) => {
      if (state.ids.includes(action.meta.arg)) {
        state.entities[action.meta.arg].simulate = {
          status: "failed",
        };
      }
    },
    [addNewPkModel.rejected]: (state, action) =>
      console.log(action.error.message),
    [addNewPkModel.fulfilled]: pkModelsAdapter.addOne,
    [updatePkModel.fulfilled]: pkModelsAdapter.upsertOne,
    [setPkVariablesByInference.fulfilled]: pkModelsAdapter.upsertOne,
  },
});

export const { togglePkModel, setSelectPkModel, addPkModels } = pkModelsSlice.actions;

export default pkModelsSlice.reducer;

export const {
  selectAll: selectAllPkModels,
  selectById: selectPkModelById,
  selectIds: selectPkModelIds,
} = pkModelsAdapter.getSelectors((state) => state.pkModels);

export const selectChosenPkModels = (state) =>
  selectAllPkModels(state).filter((pkModel) => pkModel.chosen);

export const selectWritablePkModels = (state) =>
  selectAllPkModels(state).filter((pkModel) => !pkModel.read_only);

export const selectWritablePkModelIds = (state) =>
  selectAllPkModels(state).filter((pkModel) => !pkModel.read_only).map(pkModel => pkModel.id);

export const selectReadOnlyPkModels = (state) =>
  selectAllPkModels(state).filter((pkModel) => pkModel.read_only);

