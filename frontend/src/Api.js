let authToken;
let _loggedInUser;

const isEmpty = value =>
  value === undefined ||
  value === null ||
  (typeof value === "object" && Object.keys(value).length === 0) ||
  (typeof value === "string" && value.trim().length === 0);

// check localStorage
if (!isEmpty(localStorage.getItem("authToken"))) {
  authToken = localStorage.getItem("authToken")
}

if (!isEmpty(localStorage.getItem("loggedInUser"))) {
  _loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
}


// derived from https://jasonwatmore.com/post/2020/04/18/fetch-a-lightweight-fetch-wrapper-to-simplify-http-requests
export const api = {
    login,
    logout,
    isLoggedIn,
    loggedInUser,
    get,
    post,
    patch,
    put,
    putMultiPart,
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
      return api.get('auth/users/me/').then((data) => {
        _loggedInUser = data;
        localStorage.setItem(
          "loggedInUser", 
          JSON.stringify(_loggedInUser),
        );
      });
    })
}

function logout() {
  return post('auth/token/logout').then(() => {
    authToken = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("loggedInUser");
  });
}

function isLoggedIn() {
  return !isEmpty(authToken);
}

function loggedInUser() {
  return _loggedInUser;
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

function putMultiPart(url, data) {
    const formData  = new FormData();

    for(const name in data) {
      formData.append(name, data[name]);
    }
    const requestOptions = {
        method: 'PUT',
        headers: {
          Authorization: `Token ${authToken}`,
        },
        body: formData,
    };
    return fetch(url, requestOptions).then(handleResponse);    
}

function patch(url, body) {
    const requestOptions = {
        method: 'PATCH',
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
        let data = {};
        try {
          data = text && JSON.parse(text);
        } catch(e) {
            alert(text);
        }
        if (!response.ok) {
            console.log('API error:', response.statusText, data)
            return Promise.reject(data);
        }

        return data;
    });
}
