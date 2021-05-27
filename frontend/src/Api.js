// derived from https://jasonwatmore.com/post/2020/04/18/fetch-a-lightweight-fetch-wrapper-to-simplify-http-requests

export const api = {
    get,
    post,
    put,
    delete: _delete
};

//function get(url) {
//    const requestOptions = {
//        method: 'GET'
//    };
//    return fetch(url, requestOptions).then(handleResponse);
//}
function get(url) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const data = [
        {
          id: 1,
          name: 'atest1',
        },
        {
          id: 2,
          name: 'btest2',
        },
        {
          id: 3,
          name: 'ctest3',
        },
        {
          id: 4,
          name: 'dtest4',
        },
      ]
      resolve(data);
  }, 300);
  });
}

function post(url, body) {
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
    return fetch(url, requestOptions).then(handleResponse);
}

function put(url, body) {
    const requestOptions = {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
    return fetch(url, requestOptions).then(handleResponse);    
}

// prefixed with underscored because delete is a reserved word in javascript
function _delete(url) {
    const requestOptions = {
        method: 'DELETE'
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
