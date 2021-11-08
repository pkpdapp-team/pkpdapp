import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { api } from '../../Api'

const storedVariablesAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = storedVariablesAdapter.getInitialState({
  status: 'idle',
  errorFetch: null,
})

export const fetchStoredVariables = createAsyncThunk('storedVariables/fetchStoredVariables', async (project, { dispatch }) => {
  let response = await api.get(
    `/api/storedVariable/?project_id=${project.id}`
  )
  return response
})

export const fetchStoredVariableById = createAsyncThunk('storedVariables/fetchStoredVariableById', async (model_id, { dispatch }) => {
  let response = await api.get(
    `/api/storedVariable/${model_id}/`
  )
  return response
})

export const fetchStoredVariablesByInference = createAsyncThunk('storedVariables/fetchStoredVariableById', async (inference, { dispatch }) => {
  let response = await api.get(
    `/api/storedVariable/?inference_id=${inference.id}`
  )
  return response
})


export const storedVariablesSlice = createSlice({
  name: 'storedVariables',
  initialState, 
  reducers: {
    toggleStoredVariable(state, action) {
      let storedVariable = state.entities[action.payload.id]
      storedVariable.chosen = !storedVariable.chosen
    },
    setStoredVariableError(state, action) {
      let storedVariable = state.entities[action.payload.id]
      storedVariable.error = action.payload.error 
    },
  },
  extraReducers: {
    [fetchStoredVariables.pending]: (state, action) => {
      state.status = 'loading'
    },
    [fetchStoredVariables.rejected]: (state, action) => {
      state.status = 'failed'
      state.errorFetch = action.error.message
    },
    [fetchStoredVariables.fulfilled]: (state, action) => {
      state.status = 'succeeded'
      storedVariablesAdapter.setAll(state, action.payload)
    },
    [fetchStoredVariablesByInference.fulfilled]: storedVariablesAdapter.upsertMany,
    [fetchStoredVariableById.fulfilled]: storedVariablesAdapter.upsertOne,
  }
})

export const { toggleStoredVariable } = storedVariablesSlice.actions

export default storedVariablesSlice.reducer

export const {
  selectAll: selectAllStoredVariables,
  selectById: selectStoredVariableById,
  selectIds: selectStoredVariableIds
} = storedVariablesAdapter.getSelectors(state => state.storedVariables)

export const selectChosenStoredVariables = state => selectAllStoredVariables(state).filter(storedVariable => storedVariable.chosen);
