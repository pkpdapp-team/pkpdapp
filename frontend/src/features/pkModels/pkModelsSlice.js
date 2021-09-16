import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'

import { api } from '../../Api'
import {fetchVariableById} from '../variables/variablesSlice'

const pkModelsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = pkModelsAdapter.getInitialState({
  status: 'idle',
  error: null,
})

export const fetchPkModels = createAsyncThunk('pkModels/fetchPkModels', async (project) => {
  const pkModels = await api.get(
    `/api/dosed_pharmacokinetic/?project_id=${project.id}`
  )
  return pkModels
})

export const fetchPkModelById = createAsyncThunk('pkModels/fetchPkModelById', async (model_id) => {
  const response = await api.get(
    `/api/dosed_pharmacokinetic/${model_id}/`
  )
  return response
})

export const addNewPkModel = createAsyncThunk(
  'pkModels/addNewPkModel',
  async (project, { dispatch }) => {
    const initialPkModel = {
      name: 'new',
      project: project.id,
    }
    const pkModel = await api.post(
      '/api/dosed_pharmacokinetic/', initialPkModel
    )
    for (const variable_id of pkModel.variables) {
      dispatch(fetchVariableById(variable_id))
    }
    return pkModel
  }
)

export const updatePkModel = createAsyncThunk(
  'pkModels/updatePkModel',
  async (pkModel, {dispatch}) => {
    const newPkModel = await api.put(
      `/api/dosed_pharmacokinetic/${pkModel.id}/`, pkModel
    )
    // an update could create new variables
    for (const variable_id of newPkModel.variables) {
      dispatch(fetchVariableById(variable_id))
    }
    //const simulateData = {
    //  outputs: pkModel.outputs.filter(x => x.default_value).map(x => x.name),
    //  initial_conditions: pkModel.outputs.reduce((o, x) => ({...o, x.name: x.default_value}), {}),
    //  variables: pkModel.variables.reduce((o, x) => ({...o, x.name: x.default_value}), {}),
    //}
    //const result = await api.post(
    //  `/api/dosed_pharmacokinetic/${pkModel.id}/simulate`, simulateData
    //)
    //return { ...newPkModel, simulate: result }
    return newPkModel
  }
)

export const pkModelsSlice = createSlice({
  name: 'pkModels',
  initialState, 
  reducers: {
    togglePkModel(state, action) {
      let pkModel = state.entities[action.payload.id]
      pkModel.chosen = !pkModel.chosen
    },
  },
  extraReducers: {
    [fetchPkModels.pending]: (state, action) => {
      state.status = 'loading'
    },
    [fetchPkModels.rejected]: (state, action) => {
      state.status = 'failed'
      state.error = action.error.message
    },
    [fetchPkModels.fulfilled]: (state, action) => {
      state.status = 'succeeded'
      pkModelsAdapter.setAll(state, action.payload)
    },
    [addNewPkModel.rejected]: (state, action) => console.log(action.error.message),
    [addNewPkModel.fulfilled]: pkModelsAdapter.addOne,
    [updatePkModel.fulfilled]: pkModelsAdapter.upsertOne
  }
})

export const { togglePkModel } = pkModelsSlice.actions

export default pkModelsSlice.reducer

export const {
  selectAll: selectAllPkModels,
  selectById: selectPkModelById,
  selectIds: selectPkModelIds
} = pkModelsAdapter.getSelectors(state => state.pkModels)

export const selectChosenPkModels = state => selectAllPkModels(state).filter(pkModel => pkModel.chosen);
