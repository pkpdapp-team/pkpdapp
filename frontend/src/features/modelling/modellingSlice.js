import {
  createSlice,
  createAsyncThunk,
} from "@reduxjs/toolkit";
import { setSelectDataset, setSelectDatasetProtocol } from '../datasets/datasetsSlice'
import { setSelectPkModel } from '../pkModels/pkModelsSlice'
import { setSelectPdModel } from '../pdModels/pdModelsSlice'
import { setSelectProtocol } from '../protocols/protocolsSlice'


export const selectItem = createAsyncThunk(
  "modelling/selectItem",
  async ({id, type}, { dispatch, getState }) => {
    console.log('selectItem', id, type)
    const { modelling } = getState();
    // turn off old select
    if (modelling.selectedType == 'dataset') {
      dispatch(setSelectDataset({id: modelling.selectedId, select: false}))
    }
    if (modelling.selectedType == 'pk_model') {
      dispatch(setSelectPkModel({id: modelling.selectedId, select: false})) 
    }
    if (modelling.selectedType == 'pd_model') {
      dispatch(setSelectPdModel({id: modelling.selectedId, select: false})) 
    }
    if (modelling.selectedType == 'protocol') {
      dispatch(setSelectProtocol({id: modelling.selectedId, select: false})) 
    }
    // turn on new select
    if (type == 'dataset') {
      dispatch(setSelectDataset({id: id, select: true}))
    }
    if (type == 'pk_model') {
      dispatch(setSelectPkModel({id: id, select: true})) 
    }
    if (type == 'pd_model') {
      dispatch(setSelectPdModel({id: id, select: true})) 
    }
    if (type == 'protocol') {
      dispatch(setSelectProtocol({id: id, select: true})) 
    }

    return {id: id, type: type}
  }
);

export const clearSelectItem = createAsyncThunk(
  "modelling/clearSelectItem",
  async (arg, { dispatch, getState }) => {
    console.log('clearSelectItem')
    const { modelling } = getState();
    // turn off old select
    if (modelling.selectedType == 'dataset') {
      dispatch(setSelectDataset({id: modelling.selectedId, select: false}))
    }
    if (modelling.selectedType == 'pk_model') {
      dispatch(setSelectPkModel({id: modelling.selectedId, select: false})) 
    }
    if (modelling.selectedType == 'pd_model') {
      dispatch(setSelectPdModel({id: modelling.selectedId, select: false})) 
    }
    if (modelling.selectedType == 'protocol') {
      dispatch(setSelectProtocol({id: modelling.selectedId, select: false})) 
    }
    return {id: null, type: null}
  }
);

export const modellingSlice = createSlice({
  name: 'modelling',
  initialState: {
    selectedType: null,
    selectedId: null,
  },
  reducers: {
    setSelected(state, action) {
      state.selectedType = action.payload.type
      state.selectedId = action.payload.id
    },
  },
  extraReducers: {
    [selectItem.fulfilled]: (state, action) => {
      state.selectedType = action.payload.type
      state.selectedId = action.payload.id
    },
    [clearSelectItem.fulfilled]: (state, action) => {
      state.selectedType = null
      state.selectedId = null
    },
  },
})

// Action creators are generated for each case reducer function
export const { setSelected } = modellingSlice.actions

export function selectSelected(state, type) {
  // turn off old selection
  if (type == state.modelling.selectedType) {
    return state.modelling.selectedId;
  } else {
    return null
  }
}

export default modellingSlice.reducer
