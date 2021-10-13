import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { api } from '../../Api'
import {fetchVariablesByPdModel} from '../variables/variablesSlice'
import {fetchUnitsByPdModel} from '../projects/unitsSlice'

const pdModelsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = pdModelsAdapter.getInitialState({
  status: 'idle',
  errorFetch: null,
})

export const fetchPdModels = createAsyncThunk('pdModels/fetchPdModels', async (project) => {
  const response = await api.get(
    `/api/pharmacodynamic/?project_id=${project.id}`
  )
  return response
})

export const fetchPdModelById = createAsyncThunk('pdModels/fetchPdModelById', async (model_id) => {
  const response = await api.get(
    `/api/pharmacodynamic/${model_id}/`
  )
  return response
})

export const addNewPdModel = createAsyncThunk(
  'pdModels/addNewPdModel',
  async (project, { dispatch }) => {
    const initialPdModel = {
      name: 'new',
      project: project.id,
    }
    let pdModel = await api.post(
      '/api/pharmacodynamic/', initialPdModel
    )

    dispatch(fetchVariablesByPdModel(pdModel.id))
    dispatch(fetchUnitsByPdModel(pdModel.id))

    pdModel.chosen = true;

    return pdModel
  }
)

export const deletePdModel = createAsyncThunk(
  'pdModels/deletePdModel',
  async (pdModelId, { dispatch }) => {
    await api.delete(
      `/api/pharmacodynamic/${pdModelId}`
    )
    return pdModelId
  }
)

export const uploadPdSbml = createAsyncThunk(
  'pdModels/uploadPdSbml',
  async ({id, sbml}, {rejectWithValue, dispatch}) => {
    await api.putMultiPart(
      `/api/pharmacodynamic/${id}/sbml/`, {sbml}
    )
    const pdModel = await api.get(`/api/pharmacodynamic/${id}`)
    console.log('got pdModel', pdModel)

    dispatch(fetchVariablesByPdModel(pdModel.id))
    dispatch(fetchUnitsByPdModel(pdModel.id))
    return pdModel
  }
)

export const updatePdModel = createAsyncThunk(
  'pdModels/updatePdModel',
  async (pdModel) => {
    console.log('update pd model', pdModel)
    const newPdModel = await api.put(
      `/api/pharmacodynamic/${pdModel.id}/`, pdModel
    )
    return newPdModel
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
    setPdModelError(state, action) {
      let pdModel = state.entities[action.payload.id]
      pdModel.error = action.payload.error 
    },
  },
  extraReducers: {
    [fetchPdModels.pending]: (state, action) => {
      state.status = 'loading'
    },
    [fetchPdModels.rejected]: (state, action) => {
      state.status = 'failed'
      state.errorFetch = action.error.message
    },
    [fetchPdModels.fulfilled]: (state, action) => {
      state.status = 'succeeded'
      pdModelsAdapter.setAll(state, action.payload)
    },
    [fetchPdModelById.fulfilled]: pdModelsAdapter.upsertOne,
    [addNewPdModel.fulfilled]: pdModelsAdapter.addOne,
    [updatePdModel.fulfilled]: pdModelsAdapter.upsertOne,
    [deletePdModel.fulfilled]: pdModelsAdapter.removeOne,
    [uploadPdSbml.pending]: (state, action) => {
      state.entities[action.meta.arg.id].errors = []
    },
    [uploadPdSbml.rejected]: (state, action) => {
      state.entities[action.meta.arg.id].errors = action.payload.sbml
    },
    [uploadPdSbml.fulfilled]: (state, action) => {
      pdModelsAdapter.upsertOne(state, action)
    },
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
