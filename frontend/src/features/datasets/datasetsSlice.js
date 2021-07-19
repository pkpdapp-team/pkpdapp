import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { updateProject } from '../projects/projectsSlice'
import { api } from '../../Api'

const datasetsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = datasetsAdapter.getInitialState({
  status: 'idle',
  error: null,
})

export const fetchDatasets = createAsyncThunk('datasets/fetchDatasets', async (project, { getState }) => {
  const response = await api.get(
    `/api/dataset/?project_id=${project.id}`
  )
  return response
})

export const addNewDataset = createAsyncThunk(
  'datasets/addNewDataset',
  async (project, { dispatch }) => {
    const initialDataset = {
      name: 'new',
    }
    const dataset = await api.post('/api/dataset/', initialDataset)
    if (dataset) {
      await dispatch(updateProject({
        ...project, 
        datasets: [...project.datasets, dataset.id] 
      }))
    }
    return dataset
  }
)

export const uploadDatasetCsv = createAsyncThunk(
  'pdModels/uploadDatasetCsv',
  async ({id, csv}, {rejectWithValue}) => {
    const dataset = await api.putMultiPart(
      `/api/dataset/${id}/csv/`, {csv}
    ).catch(err => rejectWithValue(err))

    return dataset
  }
)

export const updateDataset = createAsyncThunk(
  'datasets/updateDataset',
  async (dataset) => {
    const response = await api.put(`/api/dataset/${dataset.id}/`, dataset)
    return response
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
      datasetsAdapter.setAll(state, action.payload)
    },
    [addNewDataset.fulfilled]: datasetsAdapter.addOne,
    [updateDataset.fulfilled]: datasetsAdapter.upsertOne,
    [uploadDatasetCsv.pending]: (state, action) => {
      console.log('uploadcsv pending', action)
      state.entities[action.meta.arg.id].errors = []
    },
    [uploadDatasetCsv.rejected]: (state, action) => {
      console.log('upload csv rejected', action)
      state.entities[action.meta.arg.id].errors = action.payload.csv
    },
    [uploadDatasetCsv.fulfilled]: (state, action) => {
      console.log('uploadcsv fulfilled', action)
      datasetsAdapter.upsertOne(state, action)
    },
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
