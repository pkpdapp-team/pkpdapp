import { backendApi } from './backendApi'

export const api = backendApi.enhanceEndpoints({
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
