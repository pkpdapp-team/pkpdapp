import { backendApi } from './backendApi'

export const api = backendApi.enhanceEndpoints({
  addTagTypes: ['Project', 'Compound', 'Dataset'],
  endpoints: {
    // Projects
    projectList: {
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: 'Project' as const, id })),
            { type: 'Project', id: 'LIST' },
          ]
          : [{ type: 'Project', id: 'LIST' }],
    },
    projectRetrieve: {
      providesTags: (result, error, { id }) => [{ type: 'Project', id }],
    },
    projectUpdate: {
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }],
    },
    projectCreate: {
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    },
    projectDestroy: {
      invalidatesTags: (result, error, { id }) => [
        { type: 'Project', id },
        { type: 'Project', id: 'LIST' }
      ],
    },
    // Compounds
    compoundList: {
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: 'Compound' as const, id })),
            { type: 'Compound', id: 'LIST' },
          ]
          : [{ type: 'Compound', id: 'LIST' }],
    },
    compoundRetrieve: {
      providesTags: (result, error, { id }) => [{ type: 'Compound', id }],
    },
    compoundUpdate: {
      invalidatesTags: (result, error, { id }) => [{ type: 'Compound', id }],
    },
    compoundCreate: {
      invalidatesTags: [{ type: 'Compound', id: 'LIST' }],
    },
    // Datasets
    datasetList: {
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: 'Dataset' as const, id })),
            { type: 'Dataset', id: 'LIST' },
          ]
          : [{ type: 'Dataset', id: 'LIST' }],
    },
    datasetRetrieve: {
      providesTags: (result, error, { id }) => [{ type: 'Dataset', id }],
    },
    datasetUpdate: {
      invalidatesTags: (result, error, { id }) => [{ type: 'Dataset', id }],
    },
    datasetCreate: {
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
