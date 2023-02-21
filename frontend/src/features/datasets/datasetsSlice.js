import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
} from "@reduxjs/toolkit";
import { fetchBiomarkerTypesByProject } from "./biomarkerTypesSlice";
import { fetchSubjectByProject, fetchSubjectByDataset } from "./subjectsSlice";
import { setSelected } from "../modelling/modellingSlice";
import { api } from "../../Api";

const datasetsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id,
});

const initialState = datasetsAdapter.getInitialState({
  status: "idle",
  error: null,
});

export const fetchDatasets = createAsyncThunk(
  "datasets/fetchDatasets",
  async (project_id, { dispatch, getState }) => {
    const response = await api.get(`/api/dataset/?project_id=${project_id}`, getState().login.csrf);

    dispatch(fetchBiomarkerTypesByProject(project_id));
    dispatch(fetchSubjectByProject(project_id));

    return response;
  }
);

export const deleteDataset = createAsyncThunk(
  "datasets/deleteDataset",
  async (datasetId, { dispatch, getState }) => {
    let { modelling } = getState() 
    if (modelling.selectedType === 'dataset' && modelling.selectedId === datasetId) {
      await dispatch(setSelected({id: null, type: null}))
    }
    await api.delete(`/api/dataset/${datasetId}`, getState().login.csrf);
    return datasetId;
  }
);

export const addNewDataset = createAsyncThunk(
  "datasets/addNewDataset",
  async (project, { dispatch, getState }) => {
    const initialDataset = {
      name: "new",
      project: project.id,
    };
    let dataset = await api.post("/api/dataset/", getState().login.csrf, initialDataset);
    return dataset;
  }
);

export const uploadDatasetCsv = createAsyncThunk(
  "datasets/uploadDatasetCsv",
  async ({ id, csv }, { dispatch, rejectWithValue, getState }) => {
    try {
      const dataset = await api
        .putMultiPart(`/api/dataset/${id}/csv/`, getState().login.csrf, { csv })
      await dispatch(fetchBiomarkerTypesByProject(dataset.project));
      await dispatch(fetchSubjectByDataset(dataset));
      return dataset;
    } catch (err) {
      return rejectWithValue(err)
    }
  }
);

export const updateDataset = createAsyncThunk(
  "datasets/updateDataset",
  async (dataset, { getState }) => {
    const response = await api.put(`/api/dataset/${dataset.id}/`, getState().login.csrf, dataset);
    return response;
  }
);

export const datasetsSlice = createSlice({
  name: "datasets",
  initialState,
  reducers: {
    toggleDataset(state, action) {
      let dataset = state.entities[action.payload.id];
      dataset.chosen = !dataset.chosen;
    },
    setSelectDataset(state, action) {
      console.log("setSelectDataset", action.payload)
      let dataset = state.entities[action.payload.id];
      dataset.selected = action.payload.select;
    },
    toggleProtocol(state, action) {
      const dataset_id = action.payload.dataset
      let dataset = state.entities[dataset_id];
      let protocol = dataset.protocols.find(p => p.id === action.payload.id)
      protocol.chosen = !protocol.chosen;
    },
    setSelectDatasetProtocol(state, action) {
      const dataset_id = action.payload.dataset
      let dataset = state.entities[dataset_id];
      let protocol = dataset.protocols.find(p => p.id === action.payload.id)
      protocol.select = action.payload.select;
    },
    toggleDisplayGroup(state, action) {
      const group = action.payload.group;
      const id = action.payload.id;
      const displayGroups = state.entities[id].displayGroups;
      console.log("toggleDisplayGroup", group, id, displayGroups);

      let newDisplayGroups = displayGroups.filter((x) => x !== group);
      if (newDisplayGroups.length === displayGroups.length) {
        newDisplayGroups.push(group);
      }
      const changes = { displayGroups: newDisplayGroups };
      datasetsAdapter.updateOne(state, { id, changes });
    },
  },
  extraReducers: {
    [fetchDatasets.pending]: (state, action) => {
      state.status = "loading";
    },
    [fetchDatasets.rejected]: (state, action) => {
      state.status = "failed";
      state.error = action.error.message;
    },
    [fetchDatasets.fulfilled]: (state, action) => {
      state.status = "succeeded";
      datasetsAdapter.setAll(state, action.payload);
    },
    [deleteDataset.fulfilled]: datasetsAdapter.removeOne,
    [addNewDataset.fulfilled]: datasetsAdapter.addOne,
    [updateDataset.fulfilled]: datasetsAdapter.upsertOne,
    [uploadDatasetCsv.pending]: (state, action) => {
      console.log("uploadcsv pending", action);
      state.entities[action.meta.arg.id].status = "loading";
      state.entities[action.meta.arg.id].errors = [];
    },
    [uploadDatasetCsv.rejected]: (state, action) => {
      console.log("upload csv rejected", action);
      state.entities[action.meta.arg.id].status = "rejected";
      state.entities[action.meta.arg.id].errors = action.payload.csv;
    },
    [uploadDatasetCsv.fulfilled]: (state, action) => {
      console.log("uploadcsv fulfilled", action);
      state.entities[action.meta.arg.id].status = "succeeded";
      datasetsAdapter.upsertOne(state, action);
    },
  },
});

export const { toggleDataset, toggleProtocol, setSelectDataset, toggleDisplayGroup: toggleDatasetDisplayGroup } =
  datasetsSlice.actions;

export default datasetsSlice.reducer;

export const {
  selectAll: selectAllDatasets,
  selectById: selectDatasetById,
  selectIds: selectDatasetIds,
} = datasetsAdapter.getSelectors((state) => state.datasets);

export const selectChosenDatasets = (state) =>
  selectAllDatasets(state).filter((dataset) => dataset.chosen);


export const selectChosenDatasetProtocols = (state) =>
  selectAllDatasets(state).reduce((sum, dataset) => {
    return sum.concat(dataset.protocols.filter(p => p.chosen))
  }, []);

export const selectAllProtocols = (state) =>
  selectAllDatasets(state).reduce((sum, dataset) => {
    return sum.concat(dataset.protocols)
  }, []);
