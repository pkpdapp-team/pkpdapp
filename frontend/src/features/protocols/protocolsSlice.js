import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
} from "@reduxjs/toolkit";
import { api } from "../../Api";
import { setSelected } from "../modelling/modellingSlice";
import { fetchPkModelById } from "../pkModels/pkModelsSlice";

const protocolsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id,
});

const initialState = protocolsAdapter.getInitialState({
  status: "idle",
  error: null,
});

export const fetchProtocols = createAsyncThunk(
  "protocols/fetchProtocols",
  async (project_id, { getState }) => {
    const response = await api.get(`/api/protocol/?project_id=${project_id}`);
    return response;
  }
);

export const addNewProtocol = createAsyncThunk(
  "protocols/addNewProtocol",
  async (project, { dispatch }) => {
    const initialProtocol = {
      name: "new",
      dose_ids: [],
      project: project.id,
    };
    let protocol = await api.post("/api/protocol/", initialProtocol);
    return protocol;
  }
);

export const deleteProtocol = createAsyncThunk(
  "protocols/deleteProtocol",
  async (protocolId, { dispatch, getState }) => {
    let { modelling } = getState() 
    if (modelling.selectedType === 'protocol' && modelling.selectedId === protocolId) {
      await dispatch(setSelected({id: null, type: null}))
    }
    await api.delete(`/api/protocol/${protocolId}`);
    return protocolId;
  }
);

export const updateProtocol = createAsyncThunk(
  "protocols/updateProtocol",
  async (protocol, { getState, dispatch }) => {
    const dosePromises = protocol.doses.map((dose) => {
      // add or update doses
      const data = {
        protocol: protocol.id,
        ...dose,
      };
      if (dose.id) {
        return api.put(`/api/dose/${dose.id}/`, data);
      } else {
        return api.post(`/api/dose/`, data);
      }
    });
    const dose_ids = await Promise.all(dosePromises).then((doses) =>
      doses.map((x) => x.id)
    );

    // delete removed doses
    const toDelete = getState()
      .protocols.entities[protocol.id].doses.map((x) => x.id)
      .filter((x) => !dose_ids.includes(x));
    await Promise.all(
      toDelete.map((id) => {
        return api.delete(`api/dose/${id}/`);
      })
    );

    console.log("have dose_ids", dose_ids, toDelete);
    const updatedProtocol = { ...protocol, dose_ids };
    const newProtocol = await api.put(
      `/api/protocol/${protocol.id}/`,
      updatedProtocol
    );
    console.log("got new protocol", newProtocol);
    for (const pkModelId of newProtocol.dosed_pk_models) {
      console.log("fetching", pkModelId);
      dispatch(fetchPkModelById(pkModelId));
    }
    return newProtocol;
  }
);

export const protocolsSlice = createSlice({
  name: "protocols",
  initialState,
  reducers: {
    toggleProtocol(state, action) {
      let protocol = state.entities[action.payload.id];
      protocol.chosen = !protocol.chosen;
    },
    setSelectProtocol(state, action) {
      let protocol = state.entities[action.payload.id];
      protocol.selected = action.payload.select;
    },
  },
  extraReducers: {
    [fetchProtocols.pending]: (state, action) => {
      state.status = "loading";
    },
    [fetchProtocols.rejected]: (state, action) => {
      state.status = "failed";
      state.error = action.error.message;
    },
    [fetchProtocols.fulfilled]: (state, action) => {
      state.status = "succeeded";
      protocolsAdapter.setAll(state, action.payload);
    },
    [deleteProtocol.fulfilled]: protocolsAdapter.removeOne,
    [addNewProtocol.fulfilled]: protocolsAdapter.addOne,
    [addNewProtocol.rejected]: (state, action) => {
      state.status = "failed";
      state.error = action.error.message;
    },
    [updateProtocol.fulfilled]: protocolsAdapter.upsertOne,
    [updateProtocol.rejected]: (state, action) => {
      state.status = "failed";
      state.error = action.error.message;
    },
  },
});

export const { toggleProtocol, setSelectProtocol } = protocolsSlice.actions;

export default protocolsSlice.reducer;

export const {
  selectAll: selectAllProtocols,
  selectById: selectProtocolById,
  selectIds: selectProtocolIds,
} = protocolsAdapter.getSelectors((state) => state.protocols);

export const selectChosenProtocols = (state) =>
  selectAllProtocols(state).filter((protocol) => protocol.chosen);

export const selectDatasetProtocols = (state, dataset) =>
  selectAllProtocols(state).filter(
    (protocol) => protocol.dataset === dataset.id
  );

export const selectWritableProtocols = (state, dataset) =>
  selectAllProtocols(state).filter((protocol) => !protocol.read_only);
