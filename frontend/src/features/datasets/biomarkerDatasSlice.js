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
  console.log('fetchBiomarkerData', biomarkerTypeId)
  const response = await api.get(
    `/api/biomarker-data/${biomarkerTypeId}/`
  )
  response.display = true
  return response
})

export const biomarkerDatasSlice = createSlice({
  name: 'biomarkerDatas',
  initialState, 
  reducers: {
    toggleDisplay(state, action) {
      const id = action.payload
      const changes = { display: !state.entities[id].display}
      biomarkerDatasAdapter.updateOne(state, {id, changes}) 
    },
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

export const { 
  toggleDisplay: toggleBiomarkerDataDisplay, 
} = biomarkerDatasSlice.actions

export default biomarkerDatasSlice.reducer

export const {
  selectAll: selectAllBiomarkerDatas,
  selectById: selectBiomarkerDataById,
  selectIds: selectBiomarkerDataIds
} = biomarkerDatasAdapter.getSelectors(state => state.biomarkerDatas)

export const selectBiomarkerDatasByDatasetId = (state, id) => {
  console.log('selectBiomarkerDatasByDatasetId', id)
  return selectAllBiomarkerDatas(state).filter(bd => bd.dataset === id);
}

export const selectBiomarkerDatasByDatasetIds = (state, ids) => {
  console.log('selectBiomarkerDatasByDatasetIds', ids)
  const datas = selectAllBiomarkerDatas(state).filter(bd => ids.includes(bd.dataset));
  return ids.reduce((sum, id) => {
    sum[id] = datas.filter(bd => bd.dataset === id);
    return sum;
  }, {})
}
