import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { api } from '../../Api'

const priorsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = priorsAdapter.getInitialState({
  status: 'idle',
  errorFetch: null,
})


export const fetchPriorsByInference = createAsyncThunk('priors/fetchPriors', async (inference, { dispatch }) => {
  let response = await api.get(
    `/api/prior/?inference_id=${inference.id}`
  )
  return response
})

export const fetchPriorById = createAsyncThunk('priors/fetchPriorById', async (priorId, { dispatch }) => {
  let prior = await api.get(
    `/api/prior/${priorId}/`
  )
  return prior
})

export const addNewPrior = createAsyncThunk(
  'priors/addNewPrior',
  async (project, { dispatch }) => {
    const initialPrior = {
      name: 'new',
      project: project.id,
    }
    let prior = await api.post(
      '/api/prior/', initialPrior
    )

    return prior
  }
)

export const updatePrior = createAsyncThunk(
  'priors/updatePrior',
  async (prior, { getState }) => {
    const response = await api.put(`/api/prior/${prior.id}/`, prior)
    return response
  }
)

export const deletePrior = createAsyncThunk(
  'priors/deletePrior',
  async (priorId, { dispatch }) => {
    await api.delete(
      `/api/prior/${priorId}`
    )
    return priorId
  }
)

export const priorsSlice = createSlice({
  name: 'priors',
  initialState, 
  reducers: {
  },
  extraReducers: {
    [fetchPriorById.fulfilled]: priorsAdapter.upsertOne,
    [fetchPriorsByInference.fulfilled]: priorsAdapter.upsertMany,
    [addNewPrior.fulfilled]: priorsAdapter.addOne,
    [updatePrior.fulfilled]: priorsAdapter.upsertOne,
    [deletePrior.fulfilled]: priorsAdapter.removeOne,
  }
})

export const { togglePrior } = priorsSlice.actions

export default priorsSlice.reducer

export const {
  selectAll: selectAllPriors,
  selectById: selectPriorById,
  selectIds: selectPriorIds
} = priorsAdapter.getSelectors(state => state.priors)

export const selectPriorsByInference = (state, inference) => selectAllPriors(state).filter(prior => prior.inference === inference.id);

