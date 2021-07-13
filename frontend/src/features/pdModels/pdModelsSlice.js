import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { updateProject } from '../projects/projectsSlice'
import { api } from '../../Api'

const pdModelsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = pdModelsAdapter.getInitialState({
  status: 'idle',
  error: null,
})

export const fetchPdModels = createAsyncThunk('pdModels/fetchPdModels', async (project) => {
  const response = await api.get(
    `/api/pharmacodynamic/?project_id=${project.id}`
  )
  return response
})

export const addNewPdModel = createAsyncThunk(
  'pdModels/addNewPdModel',
  async (project, { dispatch }) => {
    const initialPdModel = {
      name: 'new',
    }
    const pdModel = await api.post(
      '/api/pharmacodynamic/', initialPdModel
    )
    if (pdModel) {
      await dispatch(updateProject({
        ...project, 
        pd_models: [...project.pd_models, pdModel.id] 
      }))
    }
    return pdModel
  }
)

export const updatePdModel = createAsyncThunk(
  'pdModels/updatePdModel',
  async (pdModel) => {
    const response = await api.put(
      `/api/pharmacodynamic/${pdModel.id}/`, pdModel
    )
    return response
  }
)

export const pdModelsSlice = createSlice({
  name: 'pdModels',
  initialState, 
  reducers: {
    togglePdModel(state, action) {
      let pdModel = state.entities[action.payload.id]
      pdModel.chosen = !pdModel.chosen
    },
  },
  extraReducers: {
    [fetchPdModels.pending]: (state, action) => {
      state.status = 'loading'
    },
    [fetchPdModels.rejected]: (state, action) => {
      state.status = 'failed'
      state.error = action.error.message
    },
    [fetchPdModels.fulfilled]: (state, action) => {
      state.status = 'succeeded'
      pdModelsAdapter.setAll(state, action.payload)
    },
    [addNewPdModel.fulfilled]: pdModelsAdapter.addOne,
    [addNewPdModel.rejected]: (state, action) => console.log(action.error.message),
    [updatePdModel.fulfilled]: pdModelsAdapter.upsertOne
  }
})

export const { togglePdModel } = pdModelsSlice.actions

export default pdModelsSlice.reducer

export const {
  selectAll: selectAllPdModels,
  selectById: selectPdModelById,
  selectIds: selectPdModelIds
} = pdModelsAdapter.getSelectors(state => state.pdModels)

export const selectChosenPdModels = state => selectAllPdModels(state).filter(pdModel => pdModel.chosen);
