// derived from https://jasonwatmore.com/post/2020/04/18/fetch-a-lightweight-fetch-wrapper-to-simplify-http-requests
export const api = {
  get,
  post,
  patch,
  put,
  putMultiPart,
  delete: _delete,
};

function get(url, csrf) {
  const requestOptions = {
    method: "GET",
    headers: {
      "X-CSRFToken": csrf,
    },
  };
  return fetch(url, requestOptions).then(handleResponse);
}

function post(url, csrf, body) {
  let requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
  if (csrf) {
    requestOptions.headers["X-CSRFToken"] = csrf;
  }
  return fetch(url, requestOptions).then(handleResponse);
}

function put(url, csrf, body) {
  const requestOptions = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrf,
    },
    body: JSON.stringify(body),
  };
  return fetch(url, requestOptions).then(handleResponse);
}

function putMultiPart(url, csrf, data) {
  const formData = new FormData();

  for (const name in data) {
    formData.append(name, data[name]);
  }
  const requestOptions = {
    method: "PUT",
    headers: {
      "X-CSRFToken": csrf,
    },
    body: formData,
  };
  return fetch(url, requestOptions).then(handleResponse);
}

function patch(url, csrf, body) {
  const requestOptions = {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrf,
    },
    body: JSON.stringify(body),
  };
  return fetch(url, requestOptions).then(handleResponse);
}

// prefixed with underscored because delete is a reserved word in javascript
function _delete(url, csrf) {
  const requestOptions = {
    method: "DELETE",
    headers: {
      "X-CSRFToken": csrf,
    },
  };
  return fetch(url, requestOptions).then(handleResponse);
}

// helper functions

function handleResponse(response) {
  return response.text().then((text) => {
    let data = {};
    try {
      data = text && JSON.parse(text);
    } catch (e) {
      alert(text);
    }
    if (!response.ok) {
      console.log("API error:", response, response.statusText, data);
      return Promise.reject(data);
    }
    return data;
  });
}
