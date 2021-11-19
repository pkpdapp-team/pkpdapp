import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { api } from '../../Api'

const draftInferencesAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = draftInferencesAdapter.getInitialState({
  status: 'idle',
  errorFetch: null,
})


export const fetchDraftInferences = createAsyncThunk('draftInferences/fetchDraftInferences', async (project, { dispatch }) => {
  let response = await api.get(
    `/api/draft_inference/?project_id=${project.id}`
  )
  return response
})

export const fetchDraftInferenceById = createAsyncThunk('draftInferences/fetchDraftInferenceById', async (inferenceId, { dispatch }) => {
  let inference = await api.get(
    `/api/draft_inference/${inferenceId}/`
  )

  return inference
})

export const addNewDraftInference = createAsyncThunk(
  'draftInferences/addNewDraftInference',
  async (project, { dispatch }) => {
    const initialDraftInference = {
      name: 'new',
      project: project.id,
    }
    let inference = await api.post(
      '/api/draft_inference/', initialDraftInference
    )

    inference.chosen = true;

    return inference
  }
)

export const updateDraftInference = createAsyncThunk(
  'draftInferences/updateDraftInference',
  async (inference, { getState }) => {
    const response = await api.put(`/api/draft_inference/${inference.id}/`, inference)
    return response
  }
)



export const deleteDraftInference = createAsyncThunk(
  'draftInferences/deleteDraftInference',
  async (inferenceId, { dispatch }) => {
    await api.delete(
      `/api/draft_inference/${inferenceId}`
    )
    return inferenceId
  }
)

export const draftInferencesSlice = createSlice({
  name: 'draftInferences',
  initialState, 
  reducers: {
    toggleDraftInference(state, action) {
      let inference = state.entities[action.payload.id]
      inference.chosen = !inference.chosen
    },
    setDraftInferenceError(state, action) {
      let inference = state.entities[action.payload.id]
      inference.error = action.payload.error 
    },
  },
  extraReducers: {
    [fetchDraftInferences.pending]: (state, action) => {
      state.status = 'loading'
    },
    [fetchDraftInferences.rejected]: (state, action) => {
      state.status = 'failed'
      state.errorFetch = action.error.message
    },
    [fetchDraftInferences.fulfilled]: (state, action) => {
      state.status = 'succeeded'
      draftInferencesAdapter.setAll(state, action.payload)
    },
    [fetchDraftInferenceById.fulfilled]: draftInferencesAdapter.upsertOne,
    [addNewDraftInference.fulfilled]: draftInferencesAdapter.addOne,
    [updateDraftInference.fulfilled]: draftInferencesAdapter.upsertOne,
    [deleteDraftInference.fulfilled]: draftInferencesAdapter.removeOne,
  }
})

export const { toggleDraftInference } = draftInferencesSlice.actions

export default draftInferencesSlice.reducer

export const {
  selectAll: selectAllDraftInferences,
  selectById: selectDraftInferenceById,
  selectIds: selectDraftInferenceIds
} = draftInferencesAdapter.getSelectors(state => state.draftInferences)

export const selectChosenDraftInferences = state => selectAllDraftInferences(state).filter(inference => inference.chosen);
