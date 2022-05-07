import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
} from "@reduxjs/toolkit";
import { api } from "../../Api";

const chainsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id,
});

const initialState = chainsAdapter.getInitialState({
  status: "idle",
  errorFetch: null,
});

export const fetchChains = createAsyncThunk(
  "chains/fetchChains",
  async (project, { dispatch }) => {
    let response = await api.get(
      `/api/inference_chain/?project_id=${project.id}`
    );
    return response;
  }
);

export const fetchChainById = createAsyncThunk(
  "chains/fetchChainById",
  async (model_id, { dispatch }) => {
    let response = await api.get(`/api/inference_chain/${model_id}/`);
    return response;
  }
);

export const fetchChainsByInferenceId = createAsyncThunk(
  "chains/fetchChainByInference",
  async (inferenceId, { dispatch }) => {
    console.log("fetchChainsByInference", inferenceId);
    let response = await api.get(
      `/api/inference_chain/?inference_id=${inferenceId}`
    );
    return response;
  }
);

export const chainsSlice = createSlice({
  name: "chains",
  initialState,
  reducers: {
  },
  extraReducers: {
    [fetchChains.pending]: (state, action) => {
      state.status = "loading";
    },
    [fetchChains.rejected]: (state, action) => {
      state.status = "failed";
      state.errorFetch = action.error.message;
    },
    [fetchChains.fulfilled]: (state, action) => {
      state.status = "succeeded";
      chainsAdapter.setAll(state, action.payload);
    },
    [fetchChainsByInferenceId.fulfilled]: (state, action) => {
      if (action.payload.length === 0) {
        return
      }
      console.log('fetchChainsByInferenceId', action, state)
      const existingChains = selectChainsByInferenceId(
        state, action.payload[0].inference
      )
      console.log('fetchChainsByInferenceId', existingChains)
      chainsAdapter.removeMany(existingChains)
      chainsAdapter.upsertMany(action.payload)
    },
    [fetchChainById.fulfilled]: chainsAdapter.upsertOne,
  },
});

export const { toggleChain } = chainsSlice.actions;

export default chainsSlice.reducer;

export const {
  selectAll: selectAllChains,
  selectById: selectChainById,
  selectIds: selectChainIds,
} = chainsAdapter.getSelectors((state) => state.chains);


export const selectChainsByInferenceId = (state, id) => {
  return selectAllChains(state).filter((chain) => chain.inference === id);
};
