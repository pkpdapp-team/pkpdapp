import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { api } from '../../Api'

const pdModelsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = pdModelsAdapter.getInitialState({
  status: 'idle',
  error: null,
})

export const fetchPdModels = createAsyncThunk('pdModels/fetchPdModels', async ({ getState }) => {
  const projectId = getState().projects.selected;
  const response = await api.get(
    `/api/pdModel?project_id=${projectId}`
  )
  return response.pdModels
})

export const addNewPdModel = createAsyncThunk(
  'pdModels/addNewPdModel',
  async initialPdModel => {
    const response = await api.post('/api/pdModel', { initialPdModel })
    return response.pdModel
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
      pdModelsAdapter.upsertMany(state, action.payload)
    },
    [addNewPdModel.fulfilled]: pdModelsAdapter.addOne
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
