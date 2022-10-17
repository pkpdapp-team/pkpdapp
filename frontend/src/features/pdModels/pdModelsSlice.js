import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
} from "@reduxjs/toolkit";
import { api } from "../../Api";
import { fetchVariablesByPdModel } from "../variables/variablesSlice";
import { setSelected } from "../modelling/modellingSlice";
import { fetchUnitsByPdModel } from "../projects/unitsSlice";

const pdModelsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id,
});

const initialState = pdModelsAdapter.getInitialState({
  status: "idle",
  errorFetch: null,
});

export const fetchPdModels = createAsyncThunk(
  "pdModels/fetchPdModels",
  async (project_id, { dispatch }) => {
    let response = await api.get(
      `/api/pharmacodynamic/?project_id=${project_id}`
    );
    for (var i = 0; i < response.length; i++) {
      if (!response[i].read_only) {
        dispatch(fetchPdModelSimulateById(response[i].id));
      }
    }
    return response;
  }
);

export const fetchPdModelById = createAsyncThunk(
  "pdModels/fetchPdModelById",
  async (model_id, { dispatch }) => {
    let response = await api.get(`/api/pharmacodynamic/${model_id}/`);
    dispatch(fetchPdModelSimulateById(response.id));
    return response;
  }
);

export const fetchPdModelSimulateById = createAsyncThunk(
  "pdModels/fetchPdModelSimulateById",
  async (model_id) => {
    const response = await api.post(
      `/api/pharmacodynamic/${model_id}/simulate`
    );
    return response;
  }
);

export const addNewPdModel = createAsyncThunk(
  "pdModels/addNewPdModel",
  async (project, { dispatch }) => {
    const initialPdModel = {
      name: "new",
      project: project.id,
    };
    let pdModel = await api.post("/api/pharmacodynamic/", initialPdModel);

    dispatch(fetchVariablesByPdModel(pdModel.id));
    dispatch(fetchUnitsByPdModel(pdModel.id));
    dispatch(fetchPdModelSimulateById(pdModel.id));

    return pdModel;
  }
);

export const deletePdModel = createAsyncThunk(
  "pdModels/deletePdModel",
  async (pdModelId, { dispatch, getState }) => {
    let { modelling } = getState() 
    if (modelling.selectedType === 'pd_model' && modelling.selectedId === pdModelId) {
      await dispatch(setSelected({id: null, type: null}))
    }
    await api.delete(`/api/pharmacodynamic/${pdModelId}`);
    return pdModelId;
  }
);

export const uploadPdSbml = createAsyncThunk(
  "pdModels/uploadPdSbml",
  async ({ id, sbml }, { rejectWithValue, dispatch }) => {
    await api.putMultiPart(`/api/pharmacodynamic/${id}/sbml/`, { sbml });
    let pdModel = await api.get(`/api/pharmacodynamic/${id}`);
    dispatch(fetchVariablesByPdModel(pdModel.id));
    dispatch(fetchUnitsByPdModel(pdModel.id));
    dispatch(fetchPdModelSimulateById(pdModel.id));
    return pdModel;
  }
);

export const uploadPdMmt = createAsyncThunk(
  "pdModels/uploadPdMmt",
  async ({ id, mmt }, { rejectWithValue, dispatch }) => {
    await api.putMultiPart(`/api/pharmacodynamic/${id}/mmt/`, { mmt });
    let pdModel = await api.get(`/api/pharmacodynamic/${id}`);
    dispatch(fetchVariablesByPdModel(pdModel.id));
    dispatch(fetchUnitsByPdModel(pdModel.id));
    dispatch(fetchPdModelSimulateById(pdModel.id));
    return pdModel;
  }
);

export const updatePdModel = createAsyncThunk(
  "pdModels/updatePdModel",
  async (pdModel, { dispatch }) => {
    let newPdModel = await api.put(
      `/api/pharmacodynamic/${pdModel.id}/`,
      pdModel
    );
    dispatch(fetchPdModelSimulateById(newPdModel.id));
    return newPdModel;
  }
);

export const pdModelsSlice = createSlice({
  name: "pdModels",
  initialState,
  reducers: {
    togglePdModel(state, action) {
      let pdModel = state.entities[action.payload.id];
      pdModel.chosen = !pdModel.chosen;
    },
    setSelectPdModel(state, action) {
      let pdModel = state.entities[action.payload.id];
      pdModel.selected = action.payload.select;
    },
    setPdModelError(state, action) {
      let pdModel = state.entities[action.payload.id];
      pdModel.error = action.payload.error;
    },
    addPdModels: pdModelsAdapter.upsertMany,
  },
  extraReducers: {
    [fetchPdModels.pending]: (state, action) => {
      state.status = "loading";
    },
    [fetchPdModels.rejected]: (state, action) => {
      state.status = "failed";
      state.errorFetch = action.error.message;
    },
    [fetchPdModels.fulfilled]: (state, action) => {
      state.status = "succeeded";
      pdModelsAdapter.setAll(state, action.payload);
    },


    [fetchPdModelById.fulfilled]: pdModelsAdapter.upsertOne,
    [fetchPdModelSimulateById.fulfilled]: pdModelsAdapter.upsertOne,
    [fetchPdModelSimulateById.pending]: (state, action) => {
      if (state.ids.includes(action.meta.arg)) {
        state.entities[action.meta.arg]["simulate"] = {
          status: "loading",
        };
      }
    },
    [fetchPdModelSimulateById.fulfilled]: (state, action) => {
      if (state.ids.includes(action.meta.arg)) {
        state.entities[action.meta.arg].simulate = {
          ...action.payload,
          status: "succeeded",
        };
      }
    },
    [fetchPdModelSimulateById.rejected]: (state, action) => {
      if (state.ids.includes(action.meta.arg)) {
        state.entities[action.meta.arg].simulate = {
          status: "failed",
        };
      }
    },
    [addNewPdModel.fulfilled]: pdModelsAdapter.addOne,
    [updatePdModel.fulfilled]: pdModelsAdapter.upsertOne,
    [deletePdModel.fulfilled]: pdModelsAdapter.removeOne,
    [uploadPdSbml.pending]: (state, action) => {
      state.entities[action.meta.arg.id].status = "loading";
      state.entities[action.meta.arg.id].errors = [];
    },
    [uploadPdSbml.rejected]: (state, action) => {
      state.entities[action.meta.arg.id].status = "failed";
      state.entities[action.meta.arg.id].errors = action.payload.sbml;
    },
    [uploadPdSbml.fulfilled]: (state, action) => {
      state.entities[action.meta.arg.id].status = "failed";
      pdModelsAdapter.upsertOne(state, action);
    },
    [uploadPdMmt.pending]: (state, action) => {
      state.entities[action.meta.arg.id].status = "loading";
      state.entities[action.meta.arg.id].errors = [];
    },
    [uploadPdMmt.rejected]: (state, action) => {
      state.entities[action.meta.arg.id].status = "failed";
      state.entities[action.meta.arg.id].errors = action.payload.mmt;
    },
    [uploadPdMmt.fulfilled]: (state, action) => {
      state.entities[action.meta.arg.id].status = "failed";
      pdModelsAdapter.upsertOne(state, action);
    },
  },
});

export const { togglePdModel, setSelectPdModel, addPdModels } = pdModelsSlice.actions;

export default pdModelsSlice.reducer;

export const {
  selectAll: selectAllPdModels,
  selectById: selectPdModelById,
  selectIds: selectPdModelIds,
} = pdModelsAdapter.getSelectors((state) => state.pdModels);

export const selectChosenPdModels = (state) =>
  selectAllPdModels(state).filter((pdModel) => pdModel.chosen);


export const selectWritablePdModels = (state) =>
  selectAllPdModels(state).filter((pdModel) => !pdModel.read_only);

export const selectWritablePdModelIds = (state) =>
  selectAllPdModels(state).filter((pdModel) => !pdModel.read_only).map(pdModel => pdModel.id);

export const selectReadOnlyPdModels = (state) =>
  selectAllPdModels(state).filter((pdModel) => pdModel.read_only);
