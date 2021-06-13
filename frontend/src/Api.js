let authToken;

const isEmpty = value =>
  value === undefined ||
  value === null ||
  (typeof value === "object" && Object.keys(value).length === 0) ||
  (typeof value === "string" && value.trim().length === 0);

// check localStorage
if (!isEmpty(localStorage.getItem("authToken"))) {
  authToken = localStorage.getItem("authToken")
}


// derived from https://jasonwatmore.com/post/2020/04/18/fetch-a-lightweight-fetch-wrapper-to-simplify-http-requests
export const api = {
    login,
    logout,
    isLoggedIn,
    get,
    post,
    put,
    delete: _delete
};

function login(username, password) {
    return fetch(
      'auth/token/login', 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({username, password})
      },
    ).then(handleResponse).then((data) => {
      authToken = data.auth_token;
      localStorage.setItem("authToken", authToken);
      return data;
    });
}

function logout() {
  return post('auth/token/logout').then(() => {
    authToken = null;
    localStorage.removeItem("authToken");
  });
}

function isLoggedIn() {
  return !isEmpty(authToken);
}

function get(url) {
    const requestOptions = {
        method: 'GET',
        headers: {
          Authorization: `Token ${authToken}`
        }
    };
    return fetch(url, requestOptions).then(handleResponse);
}

function post(url, body) {
    const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${authToken}`,
        },
        body: JSON.stringify(body)
    };
    return fetch(url, requestOptions).then(handleResponse);
}

function put(url, body) {
    const requestOptions = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${authToken}`,
        },
        body: JSON.stringify(body)
    };
    return fetch(url, requestOptions).then(handleResponse);    
}

// prefixed with underscored because delete is a reserved word in javascript
function _delete(url) {
    const requestOptions = {
        method: 'DELETE',
        headers: {
          Authorization: `Token ${authToken}`,
        }
    };
    return fetch(url, requestOptions).then(handleResponse);
}

// helper functions

function handleResponse(response) {
    return response.text().then(text => {
        const data = text && JSON.parse(text);
        
        if (!response.ok) {
            const error = (data && data.message) || response.statusText;
            return Promise.reject(error);
        }

        return data;
    });
}
