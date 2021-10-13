import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'

import { api } from '../../Api'
import {fetchVariablesByPkModel} from '../variables/variablesSlice'
import {fetchUnitsByPkModel} from '../projects/unitsSlice'

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

export const fetchPkModelById = createAsyncThunk('pkModels/fetchPkModelById', async (model_id, {dispatch}) => {
  const pkModel = await api.get(
    `/api/dosed_pharmacokinetic/${model_id}/`
  )
  dispatch(fetchVariablesByPkModel(pkModel.id))
  dispatch(fetchUnitsByPkModel(pkModel.id))
  return pkModel
})

export const deletePkModel = createAsyncThunk(
  'pkModels/deletePkModel',
  async (pkModelId, { dispatch }) => {
    await api.delete(
      `/api/dosed_pharmacokinetic/${pkModelId}`
    )
    return pkModelId
  }
)

export const addNewPkModel = createAsyncThunk(
  'pkModels/addNewPkModel',
  async (project, { dispatch }) => {
    const initialPkModel = {
      name: 'new',
      project: project.id,
    }
    let pkModel = await api.post(
      '/api/dosed_pharmacokinetic/', initialPkModel
    )
    dispatch(fetchVariablesByPkModel(pkModel.id))
    dispatch(fetchUnitsByPkModel(pkModel.id))
    pkModel.chosen = true;
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
    dispatch(fetchVariablesByPkModel(pkModel.id))
    dispatch(fetchUnitsByPkModel(pkModel.id))
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
    [deletePkModel.fulfilled]: pkModelsAdapter.removeOne,
    [fetchPkModelById.fulfilled]: pkModelsAdapter.upsertOne,
    [addNewPkModel.rejected]: (state, action) => console.log(action.error.message),
    [addNewPkModel.fulfilled]: pkModelsAdapter.addOne,
    [updatePkModel.fulfilled]: pkModelsAdapter.upsertOne,
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
