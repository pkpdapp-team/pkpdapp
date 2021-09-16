import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { api } from '../../Api'
import {fetchPdModelById} from '../pdModels/pdModelsSlice'
import {fetchPkModelById} from '../pkModels/pkModelsSlice'

const variablesAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = variablesAdapter.getInitialState({
  status: 'idle',
  error: null,
})

export const fetchVariables = createAsyncThunk('variables/fetchVariables', async (project, { getState }) => {

  console.log('called fetchVariables')
  const response = await api.get(
    `/api/variable/?project_id=${project.id}`
  )
  return response
})

export const addNewVariable = createAsyncThunk(
  'variables/addNewVariable',
  async () => {
    const initialVariable = {
      name: 'new',
    }
    const variable = await api.post('/api/variable/', initialVariable)
    return variable
  }
)

export const updateVariable = createAsyncThunk(
  'variables/updateVariable',
  async (variable, thunkAPI) => {
    const response = await api.patch(`/api/variable/${variable.id}/`, variable)
    if (response.pd_model) {
      thunkAPI.dispatch(fetchPdModelById(response.pd_model))
    }
    if (response.dosed_pk_model) {
      thunkAPI.dispatch(fetchPkModelById(response.dosed_pk_model))
    }
    return response
  }
)

export const variablesSlice = createSlice({
  name: 'variables',
  initialState, 
  reducers: {
  },
  extraReducers: {
    [fetchVariables.pending]: (state, action) => {
      state.status = 'loading'
    },
    [fetchVariables.rejected]: (state, action) => {
      state.status = 'failed'
      state.error = action.error.message
    },
    [fetchVariables.fulfilled]: (state, action) => {
      state.status = 'succeeded'
      variablesAdapter.setAll(state, action.payload)
    },
    [addNewVariable.fulfilled]: variablesAdapter.addOne,
    [updateVariable.fulfilled]: variablesAdapter.upsertOne,
  }
})

// export const {} = variablesSlice.actions

export default variablesSlice.reducer


export const {
  selectAll: selectAllVariables,
  selectById: selectVariableById,
  selectIds: selectVariableIds
} = variablesAdapter.getSelectors(state => state.variables)

