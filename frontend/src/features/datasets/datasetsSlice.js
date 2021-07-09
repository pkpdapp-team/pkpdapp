import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { api } from '../../Api'

const datasetsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = datasetsAdapter.getInitialState({
  status: 'idle',
  error: null,
})

export const fetchDatasets = createAsyncThunk('datasets/fetchDatasets', async ({ getState }) => {
  const projectId = getState().projects.selected;
  const response = await api.get(
    `/api/dataset?project_id=${projectId}`
  )
  return response.datasets
})

export const addNewDataset = createAsyncThunk(
  'datasets/addNewDataset',
  async initialDataset => {
    const response = await api.post('/api/dataset', { initialDataset })
    return response.dataset
  }
)

export const datasetsSlice = createSlice({
  name: 'datasets',
  initialState, 
  reducers: {
    toggleDataset(state, action) {
      let dataset = state.entities[action.payload.id]
      dataset.chosen = !dataset.chosen
    },
  },
  extraReducers: {
    [fetchDatasets.pending]: (state, action) => {
      state.status = 'loading'
    },
    [fetchDatasets.rejected]: (state, action) => {
      state.status = 'failed'
      state.error = action.error.message
    },
    [fetchDatasets.fulfilled]: (state, action) => {
      state.status = 'succeeded'
      datasetsAdapter.upsertMany(state, action.payload)
    },
    [addNewDataset.fulfilled]: datasetsAdapter.addOne
  }
})

export const { toggleDataset } = datasetsSlice.actions

export default datasetsSlice.reducer


export const {
  selectAll: selectAllDatasets,
  selectById: selectDatasetById,
  selectIds: selectDatasetIds
} = datasetsAdapter.getSelectors(state => state.datasets)


export const selectChosenDatasets = state => selectAllDatasets(state).filter(dataset => dataset.chosen);
