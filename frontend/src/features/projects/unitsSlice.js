import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { updateProject } from '../projects/projectsSlice'
import { api } from '../../Api'

const unitsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = unitsAdapter.getInitialState({
  status: 'idle',
  error: null,
})

export const fetchUnits = createAsyncThunk('units/fetchUnits', async (project, { getState }) => {
  const response = await api.get(
    `/api/unit/`
  )
  return response
})

export const addNewUnit = createAsyncThunk(
  'units/addNewUnit',
  async () => {
    const initialUnit = {
      name: 'new',
    }
    const unit = await api.post('/api/unit/', initialUnit)
    return unit
  }
)

export const updateUnit = createAsyncThunk(
  'units/updateUnit',
  async (unit) => {
    const response = await api.put(`/api/unit/${unit.id}/`, unit)
    return response
  }
)

export const unitsSlice = createSlice({
  name: 'units',
  initialState, 
  reducers: {
  },
  extraReducers: {
    [fetchUnits.pending]: (state, action) => {
      state.status = 'loading'
    },
    [fetchUnits.rejected]: (state, action) => {
      state.status = 'failed'
      state.error = action.error.message
    },
    [fetchUnits.fulfilled]: (state, action) => {
      state.status = 'succeeded'
      unitsAdapter.setAll(state, action.payload)
    },
    [addNewUnit.fulfilled]: unitsAdapter.addOne,
    [updateUnit.fulfilled]: unitsAdapter.upsertOne
  }
})

// export const {} = unitsSlice.actions

export default unitsSlice.reducer


export const {
  selectAll: selectAllUnits,
  selectById: selectUnitById,
  selectIds: selectUnitIds
} = unitsAdapter.getSelectors(state => state.units)

