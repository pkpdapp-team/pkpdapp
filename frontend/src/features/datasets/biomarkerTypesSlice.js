import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { api } from '../../Api'

const biomarkerTypesAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = biomarkerTypesAdapter.getInitialState({
  status: 'idle',
  error: null,
})

export const fetchBiomarkerType = createAsyncThunk('biomarkerTypes/fetchBiomarkerType', async (biomarkerTypeId, { getState }) => {
  const response = await api.get(
    `/api/biomarker_type/${biomarkerTypeId}/`
  )
  return response
})

export const updateBiomarkerType = createAsyncThunk(
  'biomarkerTypes/updateBiomarkerType',
  async (biomarker_type) => {
    const response = await api.put(`/api/biomarker_type/${biomarker_type.id}/`, biomarker_type)
    return response
  }
)

export const biomarkerTypesSlice = createSlice({
  name: 'biomarkerTypes',
  initialState, 
  reducers: {
    updateOne: biomarkerTypesAdapter.updateOne,
  },
  extraReducers: {
    [fetchBiomarkerType.pending]: (state, action) => {
      state.status = 'loading'
    },
    [fetchBiomarkerType.rejected]: (state, action) => {
      state.status = 'failed'
      state.error = action.error.message
    },
    [fetchBiomarkerType.fulfilled]: (state, action) => {
      state.status = 'succeeded'
      biomarkerTypesAdapter.addOne(state, action.payload)
    },
    [updateBiomarkerType.fulfilled]: biomarkerTypesAdapter.upsertOne,
  }
})

export const { 
  updateOne: updateBiomarkerTypeById
} = biomarkerTypesSlice.actions

export default biomarkerTypesSlice.reducer

export const {
  selectAll: selectAllBiomarkerTypes,
  selectById: selectBiomarkerTypeById,
  selectIds: selectBiomarkerTypeIds
} = biomarkerTypesAdapter.getSelectors(state => state.biomarkerTypes)

export const selectBiomarkerTypesByDatasetId = (state, id) => {
  return selectAllBiomarkerTypes(state).filter(bd => bd.dataset === id);
}

export const selectBiomarkerTypesByDatasetIds = (state, ids) => {
  const datas = selectAllBiomarkerTypes(state).filter(bd => ids.includes(bd.dataset));
  return ids.reduce((sum, id) => {
    sum[id] = datas.filter(bd => bd.dataset === id);
    return sum;
  }, {})
}
