import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
} from "@reduxjs/toolkit";
import { api } from "../../Api";
import { normalize, schema } from "normalizr";
import { fetchPdModelById} from '../pdModels/pdModelsSlice'
import { fetchPkModelById} from '../pkModels/pkModelsSlice'
import { 
  fetchVariablesByPkModel, 
  fetchVariablesByPdModel 
} from '../variables/variablesSlice'

const inferencesAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id,
});

const initialState = inferencesAdapter.getInitialState({
  status: "idle",
  errorFetch: null,
});

const variable = new schema.Entity("variables");
const pd_model = new schema.Entity("pd_models");
const dosed_pk_model = new schema.Entity("dosed_pk_models");
const inference = new schema.Entity("inferences", {
  variables: [variable],
  pd_model_detail: pd_model,
  dosed_pk_model_detail: dosed_pk_model,
});

export const fetchInferences = createAsyncThunk(
  "inferences/fetchInferences",
  async (project_id, { dispatch }) => {
    let response = await api.get(`/api/inference/?project_id=${project_id}`);
    //const normalized = normalize(response, [inference]);
    //console.log("fetchInferences got", response, normalized);

    return response;
  }
);

export const fetchInferenceById = createAsyncThunk(
  "inferences/fetchInferenceById",
  async (inferenceId, { dispatch }) => {
    let inference = await api.get(`/api/inference/${inferenceId}/`);
    return inference;
  }
);

export const addNewInference = createAsyncThunk(
  "inferences/addNewInference",
  async (project, { dispatch }) => {
    const initialInference = {
      name: "new",
      project: project.id,
      log_likelihoods: [],
    };
    let inference = await api.post("/api/inference/", initialInference);
    inference.chosen = true;

    return inference;
  }
);

export const updateInference = createAsyncThunk(
  "inferences/updateInference",
  async (inference, { dispatch }) => {
    const response = await api.put(
      `/api/inference/${inference.id}/`,
      inference
    );
    return response;
  }
);

export const runInferenceWizard = createAsyncThunk(
  "inferences/runInferenceWizard",
  async (inference, { dispatch }) => {
    const newInference = await api.post(`/api/inference/wizard`, inference);
    for (const log_likelihood of newInference.log_likelihoods) {
      if (log_likelihood.model && log_likelihood.model[0] === 'pkpdapp_pharmacodynamicmodel') {
        dispatch(fetchPdModelById(log_likelihood.model[1]))
        dispatch(fetchVariablesByPdModel(log_likelihood.model[1]))
      } 
      if (log_likelihood.model && log_likelihood.model[0] === 'pkpdapp_dosedpharmacokineticmodel') {
        dispatch(fetchPkModelById(log_likelihood.model[1]))
        dispatch(fetchVariablesByPkModel(log_likelihood.model[1]))
      }
    }
    return {
      newInference,
      inference,
    }
  }
);

export const runInference = createAsyncThunk(
  "inferences/runInference",
  async (inferenceId, { dispatch }) => {
    const newInference = await api.post(`/api/inference/${inferenceId}/run`);
    //const normalized = normalize(newInference, inference);
    for (const log_likelihood of newInference.log_likelihoods) {
      if (log_likelihood.pd_model) {
        dispatch(fetchPdModelById(log_likelihood.pd_model))
        dispatch(fetchVariablesByPdModel(log_likelihood.pd_model))
      } 
      if (log_likelihood.dosed_pk_model){
        dispatch(fetchPkModelById(log_likelihood.dosed_pk_model))
        dispatch(fetchVariablesByPkModel(log_likelihood.dosed_pk_model))
      }
    }
    return newInference;
  }
);

export const stopInference = createAsyncThunk(
  "inferences/stopInference",
  async (inferenceId, { dispatch }) => {
    const newInference = await api.post(`/api/inference/${inferenceId}/stop`);
    //const normalized = normalize(newInference, inference);
    return newInference;
  }
);

export const deleteInference = createAsyncThunk(
  "inferences/deleteInference",
  async (inferenceId, { dispatch }) => {
    await api.delete(`/api/inference/${inferenceId}/`);
    return inferenceId;
  }
);

export const inferencesSlice = createSlice({
  name: "inferences",
  initialState,
  reducers: {
    toggleInference(state, action) {
      for (let inference of Object.values(state.entities)) {
        if (inference.id === action.payload.id) {
          inference.chosen = true
        } else {
          inference.chosen = false
        }
      }
    },
    setInferenceError(state, action) {
      let inference = state.entities[action.payload.id];
      inference.error = action.payload.error;
    },
  },
  extraReducers: {
    [fetchInferences.pending]: (state, action) => {
      state.status = "loading";
    },
    [fetchInferences.rejected]: (state, action) => {
      state.status = "failed";
      state.errorFetch = action.error.message;
    },
    [fetchInferences.fulfilled]: (state, action) => {
      inferencesAdapter.upsertMany(state, action.payload);
      state.status = "succeeded";
    },
    [fetchInferenceById.fulfilled]: inferencesAdapter.upsertOne,
    [runInference.fulfilled]: (state, action) => {
      inferencesAdapter.upsertOne(state, action.payload);
    },
    [runInferenceWizard.fulfilled]: (state, action) => {
      if (action.payload.inference.id) {
        inferencesAdapter.removeOne(state, action.payload.inference.id);
      }
      for (let inference of Object.values(state.entities)) {
          inference.chosen = false
      }
      action.payload.newInference.chosen = true
      inferencesAdapter.upsertOne(state, action.payload.newInference);
    },
    [stopInference.fulfilled]: (state, action) => {
      inferencesAdapter.upsertOne(state, action.payload);
    },
    [addNewInference.fulfilled]: inferencesAdapter.addOne,
    [updateInference.fulfilled]: inferencesAdapter.upsertOne,
    [deleteInference.fulfilled]: inferencesAdapter.removeOne,
  },
});

export const { toggleInference } = inferencesSlice.actions;

export default inferencesSlice.reducer;

export const {
  selectAll: selectAllInferences,
  selectById: selectInferenceById,
  selectIds: selectInferenceIds,
} = inferencesAdapter.getSelectors((state) => state.inferences);

export const selectChosenInferences = (state) =>
  selectAllInferences(state).filter((inference) => inference.chosen);

export const selectChosenRunningInferences = (state) =>
  selectAllInferences(state).filter(
    (inference) => inference.chosen && inference.read_only
  );

export const selectChosenDraftInferences = (state) =>
  selectAllInferences(state).filter(
    (inference) => inference.chosen && !inference.read_only
  );

export const selectAllDraftInferences = (state) =>
  selectAllInferences(state).filter((inference) => !inference.read_only);

export const selectAllRunningInferences = (state) =>
  selectAllInferences(state).filter((inference) => inference.read_only);
