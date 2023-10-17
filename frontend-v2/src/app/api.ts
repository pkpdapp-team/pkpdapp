import { backendApi } from './backendApi'

export const api = backendApi.enhanceEndpoints({
  addTagTypes: ['Project', 'Compound', 'Dataset', 'CombinedModel', 'Variable', 'Simulation', 'Protocol', 'Unit'],
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
      invalidatesTags: (result, error, { id }) => [{ type: 'Compound', id }, { type: 'Unit', id: 'LIST' }],
    },
    compoundCreate: {
      invalidatesTags: [{ type: 'Compound', id: 'LIST' }],
    },
    compoundDestroy: {
      invalidatesTags: (result, error, { id }) => [
        { type: 'Compound', id },
        { type: 'Compound', id: 'LIST' }
      ],
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
    datasetDestroy: {
      invalidatesTags: (result, error, { id }) => [
        { type: 'Dataset', id },
        { type: 'Dataset', id: 'LIST' }
      ],
    },
    // CombinedModel
    combinedModelList: {
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: 'CombinedModel' as const, id })),
            { type: 'CombinedModel', id: 'LIST' },
          ]
          : [{ type: 'CombinedModel', id: 'LIST' }],
    },
    combinedModelRetrieve: {
      providesTags: (result, error, { id }) => [{ type: 'CombinedModel', id }],
    },
    combinedModelUpdate: {
      invalidatesTags: (result, error, { id }) => [{ type: 'CombinedModel', id }, { type: 'Variable', id: 'LIST' }, { type: 'Protocol', id: 'LIST' }],
    },
    combinedModelCreate: {
      invalidatesTags: [{ type: 'CombinedModel', id: 'LIST' }, { type: 'Variable', id: 'LIST' }],
    },
    combinedModelDestroy: {
      invalidatesTags: (result, error, { id }) => [
        { type: 'CombinedModel', id },
        { type: 'CombinedModel', id: 'LIST' },
        { type: 'Variable', id: 'LIST' }
      ],
    },
    variableList: {
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: 'Variable' as const, id })),
            { type: 'Variable', id: 'LIST' },
          ]
          : [{ type: 'Variable', id: 'LIST' }],
      },
    variableRetrieve: {
      providesTags: (result, error, { id }) => [{ type: 'Variable', id }],
    },
    variableUpdate: {
      invalidatesTags: (result, error, { id }) => [{ type: 'Variable', id }, { type: 'Protocol', id: 'LIST' }],
    },
    variableCreate: {
      invalidatesTags: [{ type: 'Variable', id: 'LIST' }],
    },
    variableDestroy: {
      invalidatesTags: (result, error, { id }) => [
        { type: 'Variable', id },
        { type: 'Variable', id: 'LIST' }
      ],
    },
    simulationList: {
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: 'Simulation' as const, id })),
            { type: 'Simulation', id: 'LIST' },
          ]
          : [{ type: 'Simulation', id: 'LIST' }],
        },
    simulationRetrieve: {
      providesTags: (result, error, { id }) => [{ type: 'Simulation', id }],
    },
    simulationUpdate: {
      invalidatesTags: (result, error, { id }) => [{ type: 'Simulation', id }],
    },
    simulationCreate: {
      invalidatesTags: [{ type: 'Simulation', id: 'LIST' }],
    },
    simulationDestroy: {
      invalidatesTags: (result, error, { id }) => [
        { type: 'Simulation', id },
        { type: 'Simulation', id: 'LIST' }
      ],
    },
    protocolList: {
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: 'Protocol' as const, id })),
            { type: 'Protocol', id: 'LIST' },
          ]
          : [{ type: 'Protocol', id: 'LIST' }],
        },
    protocolRetrieve: {
      providesTags: (result, error, { id }) => [{ type: 'Protocol', id }],
    },
    protocolUpdate: {
      invalidatesTags: (result, error, { id }) => [{ type: 'Protocol', id }],
    },
    protocolCreate: {
      invalidatesTags: [{ type: 'Protocol', id: 'LIST' }],
    }, 
    protocolDestroy: {
      invalidatesTags: (result, error, { id }) => [
        { type: 'Protocol', id },
        { type: 'Protocol', id: 'LIST' }
      ],
    },
    unitList: {
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: 'Unit' as const, id })),
            { type: 'Unit', id: 'LIST' },
          ]
          : [{ type: 'Unit', id: 'LIST' }],
    },
    unitRetrieve: {
      providesTags: (result, error, { id }) => [{ type: 'Unit', id }],
    },
    unitUpdate: {
      invalidatesTags: (result, error, { id }) => [{ type: 'Unit', id }],
    },
    unitCreate: {
      invalidatesTags: [{ type: 'Unit', id: 'LIST' }],
    },
    unitDestroy: {
      invalidatesTags: (result, error, { id }) => [
        { type: 'Unit', id },
        { type: 'Unit', id: 'LIST' }
      ],
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
});
