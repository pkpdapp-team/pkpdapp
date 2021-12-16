import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { api } from '../../Api'
import { normalize, schema } from 'normalizr';

import { fetchChainsByInference } from './chainSlice'

const inferencesAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = inferencesAdapter.getInitialState({
  status: 'idle',
  errorFetch: null,
})

const variable = new schema.Entity('variables');
const pd_model = new schema.Entity('pd_models');
const dosed_pk_model = new schema.Entity('dosed_pk_models');
const inference = new schema.Entity('inferences', {
  variables: [variable],
  pd_model_detail: pd_model,
  dosed_pk_model_detail: dosed_pk_model,
});

export const fetchInferences = createAsyncThunk('inferences/fetchInferences', async (project, { dispatch }) => {
  let response = await api.get(
    `/api/inference/?project_id=${project.id}`
  )
  const normalized = normalize(response, [inference]);
  console.log('fetchInferences got', response, normalized)

  return normalized.entities
})

export const fetchInferenceById = createAsyncThunk('inferences/fetchInferenceById', async (inferenceId, { dispatch }) => {
  let inference = await api.get(
    `/api/inference/${inferenceId}/`
  )
  return inference
})

export const addNewInference = createAsyncThunk(
  'inferences/addNewInference',
  async (project, { dispatch }) => {
    const initialInference = {
      name: 'new',
      project: project.id,
      priors: [],
      objective_functions: [],
    }
    let inference = await api.post(
      '/api/inference/', initialInference
    )
    inference.chosen = true;

    return inference
  }
)

export const updateInference = createAsyncThunk(
  'inferences/updateInference',
  async (inference, { dispatch }) => {
    const response = await api.put(`/api/inference/${inference.id}/`, inference)
    return response
  }
)

export const runInference = createAsyncThunk(
  'inferences/runInference',
  async (inferenceId, { dispatch }) => {
    console.log('XXXXX running inference, id:', inferenceId)
    const newInference = await api.post(`/api/inference/${inferenceId}/run`)
    console.log('XXXXX ran inference, new one is:', newInference)
    const normalized = normalize(newInference, inference);
    return normalized.entities
  }
)

export const deleteInference = createAsyncThunk(
  'inferences/deleteInference',
  async (inferenceId, { dispatch }) => {
    await api.delete(
      `/api/inference/${inferenceId}`
    )
    return inferenceId
  }
)

export const inferencesSlice = createSlice({
  name: 'inferences',
  initialState, 
  reducers: {
    toggleInference(state, action) {
      let inference = state.entities[action.payload.id]
      inference.chosen = !inference.chosen
    },
    setInferenceError(state, action) {
      let inference = state.entities[action.payload.id]
      inference.error = action.payload.error 
    },
  },
  extraReducers: {
    [fetchInferences.pending]: (state, action) => {
      state.status = 'loading'
    },
    [fetchInferences.rejected]: (state, action) => {
      state.status = 'failed'
      state.errorFetch = action.error.message
    },
    [fetchInferences.fulfilled]: (state, action) => {
      if (action.payload.inferences) {
        inferencesAdapter.upsertMany(state, action.payload.inferences)
      }
      state.status = 'succeeded'
    },
    [fetchInferenceById.fulfilled]: inferencesAdapter.upsertOne,
    [runInference.fulfilled]: (state, action) => {
      inferencesAdapter.upsertMany(state, action.payload.inferences)
    },
    [addNewInference.fulfilled]: inferencesAdapter.addOne,
    [updateInference.fulfilled]: inferencesAdapter.upsertOne,
    [deleteInference.fulfilled]: inferencesAdapter.removeOne,
  }
})

export const { toggleInference } = inferencesSlice.actions

export default inferencesSlice.reducer

export const {
  selectAll: selectAllInferences,
  selectById: selectInferenceById,
  selectIds: selectInferenceIds
} = inferencesAdapter.getSelectors(state => state.inferences)


export const selectChosenInferences = state => selectAllInferences(state).filter(inference => inference.chosen);

export const selectChosenRunningInferences = state => selectAllInferences(state).filter(inference => inference.chosen && inference.read_only);

export const selectChosenDraftInferences = state => selectAllInferences(state).filter(inference => inference.chosen && !inference.read_only);

export const selectAllDraftInferences = state => selectAllInferences(state).filter(inference => !inference.read_only);

export const selectAllRunningInferences = state => selectAllInferences(state).filter(inference => inference.read_only);


