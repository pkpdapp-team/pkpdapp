import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { api } from '../../Api'
import {fetchChainsByPrior} from './chainSlice'

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
  for (const prior of response) {
    dispatch(fetchChainsByPrior(prior))
  }
  return response
})

export const fetchPriorById = createAsyncThunk('priors/fetchPriorById', async (priorId, { dispatch }) => {
  let prior = await api.get(
    `/api/prior/${priorId}/`
  )

  dispatch(fetchChainsByPrior(prior))

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
    console.log('got new prior', prior)

    dispatch(fetchChainsByPrior(prior))

    prior.chosen = true;

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

export const runPrior = createAsyncThunk(
  'priors/runPrior',
  async (priorId, { getState }) => {
    const newPrior = await api.post(`/api/draft_prior/${priorId}/run`)
    return newPrior
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
    togglePrior(state, action) {
      let prior = state.entities[action.payload.id]
      prior.chosen = !prior.chosen
    },
    setPriorError(state, action) {
      let prior = state.entities[action.payload.id]
      prior.error = action.payload.error 
    },
  },
  extraReducers: {
    [fetchPriors.pending]: (state, action) => {
      state.status = 'loading'
    },
    [fetchPriors.rejected]: (state, action) => {
      state.status = 'failed'
      state.errorFetch = action.error.message
    },
    [fetchPriors.fulfilled]: (state, action) => {
      state.status = 'succeeded'
      priorsAdapter.setAll(state, action.payload)
    },
    [fetchPriorById.fulfilled]: priorsAdapter.upsertOne,
    [runPrior.fulfilled]: priorsAdapter.addOne,
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

export const selectChosenPriors = state => selectAllPriors(state).filter(prior => prior.chosen);
