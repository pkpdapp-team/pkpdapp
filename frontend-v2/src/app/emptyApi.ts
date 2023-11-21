// Or from '@reduxjs/toolkit/query' if not using the auto-generated hooks
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { selectCsrf } from '../features/login/loginSlice';
import { RootState } from './store';

const baseQuery = fetchBaseQuery({
  baseUrl: "/",
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const csrf = selectCsrf(getState() as RootState)
    if (csrf) {
      headers.set("X-CSRFToken", csrf);
    }
    return headers;
  }
});

// initialize an empty api service that we'll inject endpoints into later as needed
export const emptySplitApi = createApi({
  baseQuery,
  endpoints: () => ({}),
});

