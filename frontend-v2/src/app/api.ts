import { backendApi } from './backendApi'

export const api = backendApi.enhanceEndpoints({
  addTagTypes: ['Project', 'Compound', 'Dataset'],
  endpoints: {
    // Projects
    listProjects: {
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: 'Project' as const, id })),
            { type: 'Project', id: 'LIST' },
          ]
          : [{ type: 'Project', id: 'LIST' }],
    },
    retrieveProject: {
      providesTags: (result, error, { id }) => [{ type: 'Project', id }],
    },
    updateProject: {
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }],
    },
    createProject: {
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    },
    destroyProject: {
      invalidatesTags: (result, error, { id }) => [
        { type: 'Project', id },
        { type: 'Project', id: 'LIST' }
      ],
    },
    // Compounds
    listCompounds: {
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: 'Compound' as const, id })),
            { type: 'Compound', id: 'LIST' },
          ]
          : [{ type: 'Compound', id: 'LIST' }],
    },
    retrieveCompound: {
      providesTags: (result, error, { id }) => [{ type: 'Compound', id }],
    },
    updateCompound: {
      invalidatesTags: (result, error, { id }) => [{ type: 'Compound', id }],
    },
    createCompound: {
      invalidatesTags: [{ type: 'Compound', id: 'LIST' }],
    },
    // Datasets
    listDatasets: {
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: 'Dataset' as const, id })),
            { type: 'Dataset', id: 'LIST' },
          ]
          : [{ type: 'Dataset', id: 'LIST' }],
    },
    retrieveDataset: {
      providesTags: (result, error, { id }) => [{ type: 'Dataset', id }],
    },
    updateDataset: {
      invalidatesTags: (result, error, { id }) => [{ type: 'Dataset', id }],
    },
    createDataset: {
      invalidatesTags: [{ type: 'Dataset', id: 'LIST' }],
    },
  },
  //addTagTypes: ['User'],
  //endpoints: {
  //  getUserByUserId: {
  //    providesTags: ['User'],
  //  },
  //  patchUserByUserId: {
  //    invalidatesTags: ['User'],
  //  },
  //  // alternatively, define a function which is called with the endpoint definition as an argument
  //  getUsers(endpoint) {
  //    endpoint.providesTags = ['User']
  //    endpoint.keepUnusedDataFor = 120
  //  },
  //},
})
