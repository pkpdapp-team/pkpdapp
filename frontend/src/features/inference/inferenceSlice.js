import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { api } from '../../Api'
import {fetchStoredVariablesByInference} from './storedVariableSlice'
import {fetchChainsByInference} from './chainSlice'

const inferencesAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = inferencesAdapter.getInitialState({
  status: 'idle',
  errorFetch: null,
})


export const fetchInferences = createAsyncThunk('inferences/fetchInferences', async (project, { dispatch }) => {
  let response = await api.get(
    `/api/inference/?project_id=${project.id}`
  )
  for (const inference of response) {
    dispatch(fetchChainsByInference(inference))
    dispatch(fetchStoredVariablesByInference(inference))
  }
  return response
})

export const fetchInferenceById = createAsyncThunk('inferences/fetchInferenceById', async (inferenceId, { dispatch }) => {
  let inference = await api.get(
    `/api/inference/${inferenceId}/`
  )

  dispatch(fetchChainsByInference(inference))
  dispatch(fetchStoredVariablesByInference(inference))

  return inference
})

export const addNewInference = createAsyncThunk(
  'inferences/addNewInference',
  async (project, { dispatch }) => {
    const initialInference = {
      name: 'new',
      project: project.id,
    }
    let inference = await api.post(
      '/api/inference/', initialInference
    )
    console.log('got new inference', inference)

    dispatch(fetchChainsByInference(inference))
    dispatch(fetchStoredVariablesByInference(inference))

    inference.chosen = true;

    return inference
  }
)

export const updateInference = createAsyncThunk(
  'inferences/updateInference',
  async (inference, { getState }) => {
    const oldInference = selectInferenceById(getState(), inference.id);

    // if a model has changed, then need to delete the old stored model and create a new one
    if (oldInference.pd_model !== inference.pd_model) {
      const storedModel = await api.post(`/api/pharmacodynamic/${inference.id}/copy`)

    } else if (oldInference.dosed_pk_model !== inference.dosed_pk_model) {
    } else if (oldInference.pkpd_model !== inference.pkpd_model) {
    }
    const response = await api.put(`/api/inference/${inference.id}/`, inference)
    return response
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
      state.status = 'succeeded'
      inferencesAdapter.setAll(state, action.payload)
    },
    [fetchInferenceById.fulfilled]: inferencesAdapter.upsertOne,
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
