import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { api } from '../../Api'

const biomarkerDatasAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = biomarkerDatasAdapter.getInitialState({
  status: 'idle',
  error: null,
})

export const fetchBiomarkerData = createAsyncThunk('biomarkerDatas/fetchBiomarkerData', async (biomarkerTypeId, { getState }) => {
  const response = await api.get(
    `/api/biomarker-type/${biomarkerTypeId}/data`
  )
  return response
})

export const biomarkerDatasSlice = createSlice({
  name: 'biomarkerDatas',
  initialState, 
  reducers: {
  },
  extraReducers: {
    [fetchBiomarkerData.pending]: (state, action) => {
      state.status = 'loading'
    },
    [fetchBiomarkerData.rejected]: (state, action) => {
      state.status = 'failed'
      state.error = action.error.message
    },
    [fetchBiomarkerData.fulfilled]: (state, action) => {
      state.status = 'succeeded'
      biomarkerDatasAdapter.addOne(state, action.payload)
    },
  }
})

export default biomarkerDatasSlice.reducer

export const {
  selectAll: selectAllBiomarkerDatas,
  selectById: selectBiomarkerDataById,
  selectIds: selectBiomarkerDataIds
} = biomarkerDatasAdapter.getSelectors(state => state.biomarkerDatas)
