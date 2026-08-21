import storageSessionCjs from "redux-persist/lib/storage/session";

// @ts-expect-error shim legacy CJS export for redux-persist session storage
const { default: storageSession } = storageSessionCjs;

export default storageSession;
