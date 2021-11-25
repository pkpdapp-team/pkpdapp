import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { api } from '../../Api'
import {fetchChainsByInference} from './chainSlice'
import {fetchPriorsByInference} from './priorsSlice'
import {fetchObjectiveFunctionsByInference} from './objectiveFunctionsSlice'

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
    dispatch(fetchPriorsByInference(inference))
    dispatch(fetchObjectiveFunctionsByInference(inference))
  }
  return response
})

export const fetchInferenceById = createAsyncThunk('inferences/fetchInferenceById', async (inferenceId, { dispatch }) => {
  let inference = await api.get(
    `/api/inference/${inferenceId}/`
  )

  dispatch(fetchChainsByInference(inference))
  dispatch(fetchPriorsByInference(inference))
  dispatch(fetchObjectiveFunctionsByInference(inference))

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
    console.log('got new inference', inference)

    dispatch(fetchChainsByInference(inference))
    dispatch(fetchPriorsByInference(inference))
    dispatch(fetchObjectiveFunctionsByInference(inference))

    inference.chosen = true;

    return inference
  }
)

export const updateInference = createAsyncThunk(
  'inferences/updateInference',
  async (inference, { getState }) => {
    const response = await api.put(`/api/inference/${inference.id}/`, inference)
    return response
  }
)

export const runInference = createAsyncThunk(
  'inferences/runInference',
  async (inferenceId, { getState }) => {
    const newInference = await api.post(`/api/draft_inference/${inferenceId}/run`)
    return newInference
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
    [runInference.fulfilled]: inferencesAdapter.addOne,
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

export const selectChosenRunningInferences = state => selectAllInferences(state).filter(inference => inference.chosen && inference.read_only);

export const selectChosenDraftInferences = state => selectAllInferences(state).filter(inference => inference.chosen && !inference.read_only);

export const selectAllDraftInferences = state => selectAllInferences(state).filter(inference => !inference.read_only);

export const selectAllRunningInferences = state => selectAllInferences(state).filter(inference => inference.read_only);


