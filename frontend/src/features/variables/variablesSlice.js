import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
} from "@reduxjs/toolkit";
import { api } from "../../Api";
import { fetchPdModelById } from "../pdModels/pdModelsSlice";
import { fetchPkModelById } from "../pkModels/pkModelsSlice";

const variablesAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id,
});

const initialState = variablesAdapter.getInitialState({
  status: "idle",
  error: null,
});

export const fetchVariables = createAsyncThunk(
  "variables/fetchVariables",
  async (project_id, { getState }) => {
    console.log("called fetchVariables");
    const response = await api.get(`/api/variable/?project_id=${project_id}`, getState().login.csrf);
    return response;
  }
);

export const fetchVariableById = createAsyncThunk(
  "variables/fetchVariableById",
  async (variable_id, { getState }) => {
    const response = await api.get(`/api/variable/${variable_id}/`, getState().login.csrf);
    return response;
  }
);

export const fetchVariablesByPdModel = createAsyncThunk(
  "variables/fetchVariablesByPdModel",
  async (pd_model_id, { getState }) => {
    const response = await api.get(`/api/variable/?pd_model_id=${pd_model_id}`, getState().login.csrf);
    const responseIds = response.map(v => v.id)
    const state = getState()
    const existingVariables = selectVariablesByPdModel(state, pd_model_id)
    const deletedVariables = existingVariables.filter(v => responseIds.indexOf(v.id) === -1)
    return {
      variables: response,
      deletedVariables
    };
  }
);


export const fetchVariablesByPkModel = createAsyncThunk(
  "variables/fetchVariablesByPkModel",
  async (pk_model_id, { getState }) => {
    const response = await api.get(
      `/api/variable/?dosed_pk_model_id=${pk_model_id}`, getState().login.csrf
    );
    const responseIds = response.map(v => v.id)
    const state = getState()
    const existingVariables = selectVariablesByDosedPkModel(state, pk_model_id)
    const deletedVariables = existingVariables.filter(v => responseIds.indexOf(v.id) === -1)
    return {
      variables: response,
      deletedVariables
    };
  }
);

export const addNewVariable = createAsyncThunk(
  "variables/addNewVariable",
  async (_, { getState }) => {
    const initialVariable = {
      name: "new",
    };
    const variable = await api.post("/api/variable/", getState().login.csrf, initialVariable);
    return variable;
  }
);

export const updateVariable = createAsyncThunk(
  "variables/updateVariable",
  async (variable, { dispatch, getState }) => {
    const response = await api.patch(`/api/variable/${variable.id}/`, getState().login.csrf, variable);
    if (response.pd_model) {
      dispatch(fetchPdModelById(response.pd_model));
    }
    if (response.dosed_pk_model) {
      dispatch(fetchPkModelById(response.dosed_pk_model));
    }
    return response;
  }
);

export const variablesSlice = createSlice({
  name: "variables",
  initialState,
  reducers: {
    addVariables: variablesAdapter.upsertMany,
  },
  extraReducers: {
    [fetchVariables.pending]: (state, action) => {
      state.status = "loading";
    },
    [fetchVariables.rejected]: (state, action) => {
      state.status = "failed";
      state.error = action.error.message;
    },
    [fetchVariables.fulfilled]: (state, action) => {
      state.status = "succeeded";
      variablesAdapter.setAll(state, action.payload);
    },
    [fetchVariableById.fulfilled]: variablesAdapter.upsertOne,
    [fetchVariablesByPdModel.fulfilled]: (state, action) => {
      state.status = "succeeded";
      if (action.payload.deletedVariables.length > 0) {
        variablesAdapter.removeMany(state, action.payload.deletedVariables.map(v => v.id))
      }
      variablesAdapter.upsertMany(state, action.payload.variables);
    },
    [fetchVariablesByPkModel.fulfilled]: (state, action) => {
      state.status = "succeeded";
      if (action.payload.deletedVariables.length > 0) {
        variablesAdapter.removeMany(state, action.payload.deletedVariables.map(v => v.id))
      }
      variablesAdapter.upsertMany(state, action.payload.variables);
    },
    [addNewVariable.fulfilled]: variablesAdapter.addOne,
    [updateVariable.fulfilled]: variablesAdapter.upsertOne,
  },
});

export const { addVariables } = variablesSlice.actions;

export default variablesSlice.reducer;

export const {
  selectAll: selectAllVariables,
  selectById: selectVariableById,
  selectIds: selectVariableIds,
} = variablesAdapter.getSelectors((state) => state.variables);

export const selectVariablesByPdModel = (state, model_id, model_type) =>
  selectAllVariables(state).filter(
    (variable) => variable.pd_model === model_id
  );

export const selectVariablesByDosedPkModel = (state, model_id, model_type) =>
  selectAllVariables(state).filter(
    (variable) => variable.dosed_pk_model === model_id
  );

export const selectVariablesByPkpdModel = (state, model_id, model_type) =>
  selectAllVariables(state).filter(
    (variable) => variable.pkpd_model === model_id
  );
