import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'

import { updateProject } from '../projects/projectsSlice'

import { api } from '../../Api'

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

export const addNewPkModel = createAsyncThunk(
  'pkModels/addNewPkModel',
  async (project, { dispatch }) => {
    const initialPkModel = {
      name: 'new',
    }
    const pkModel = await api.post(
      '/api/dosed_pharmacokinetic/', initialPkModel
    )
    if (pkModel) {
      await dispatch(updateProject({
        ...project, 
        pk_models: [...project.pk_models, pkModel.id] 
      }))
    }
    return pkModel
  }
)

export const updatePkModel = createAsyncThunk(
  'pkModels/updatePkModel',
  async (pkModel) => {
    const newPkModel = await api.put(
      `/api/dosed_pharmacokinetic/${pkModel.id}/`, pkModel
    )
    return {...newPkModel, chosen: pkModel.chosen}
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
