import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { api } from '../../Api'

const protocolsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = protocolsAdapter.getInitialState({
  status: 'idle',
  error: null,
})

export const fetchProtocols = createAsyncThunk('protocols/fetchProtocols', async (project, { getState }) => {
  const response = await api.get(
    `/api/protocol/?project_id=${project.id}`
  )
  return response
})

export const addNewProtocol = createAsyncThunk(
  'protocols/addNewProtocol',
  async () => {
    const initialProtocol = {
      name: 'new',
    }
    const response = await api.post('/api/protocol/', initialProtocol)
    return response
  }
)

export const updateProtocol = createAsyncThunk(
  'protocols/updateProtocol',
  async (protocol) => {
    const response = await api.put(`/api/protocol/${protocol.id}/`, protocol)
    return response
  }
)

export const protocolsSlice = createSlice({
  name: 'protocols',
  initialState, 
  reducers: {
    toggleProtocol(state, action) {
      let protocol = state.entities[action.payload.id]
      protocol.chosen = !protocol.chosen
    },
  },
  extraReducers: {
    [fetchProtocols.pending]: (state, action) => {
      state.status = 'loading'
    },
    [fetchProtocols.rejected]: (state, action) => {
      state.status = 'failed'
      state.error = action.error.message
    },
    [fetchProtocols.fulfilled]: (state, action) => {
      state.status = 'succeeded'
      protocolsAdapter.setAll(state, action.payload)
    },
    [addNewProtocol.fulfilled]: protocolsAdapter.addOne,
    [updateProtocol.fulfilled]: protocolsAdapter.upsertOne
  }
})

export const { toggleProtocol } = protocolsSlice.actions

export default protocolsSlice.reducer


export const {
  selectAll: selectAllProtocols,
  selectById: selectProtocolById,
  selectIds: selectProtocolIds
} = protocolsAdapter.getSelectors(state => state.protocols)


export const selectChosenProtocols = state => selectAllProtocols(state).filter(protocol => protocol.chosen);
