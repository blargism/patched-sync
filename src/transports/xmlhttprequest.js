/**
 * A transport using XMLHttpRequest.
 *
 * @author Joe Mills
 * @module transports/xmlhttprequest
 */

export default class XMLHttpRequestTransport {
  constructor(get_url, patch_url, interval) {
    this.get_url = get_url;
    this.patch_url = patch_url;
    this.interval = interval || 30000;

    this._config = {
      withCredentials: true,
      onProgress: null,
      onReadyStateChange: null,
      headers: {},
    };
  }

  config(config) {
    if (config.onProgress) this._config.onProgress = config.onProgress;
    if (config.onReadyStateChange) this._config.onReadyStateChange = config.onReadyStateChange;
    if (config.withCredentials) this.withCredentials = config.withCredentials;
    if (config.headers) this._config.headers = config.headers;
  }

  async get() {
    return transport("GET", this.get_url, null, this._config);
  }

  async patch(patch) {
    return transport("PATCH", this.patch_url, patch, this._config);
  }
}

const transport = (method, url, body, opts) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.addEventListener('load', function () {
      try {
        const response = JSON.parse(this.responseText);

        if (this.status > 399) {
          return reject(response);
        }

        return resolve(response);
      } catch (e) {
        reject({
          error: 'Textual response, not JSON',
          message: this.responseText
        });
      }
    });

    xhr.addEventListener('error', function (err) {
      reject(this, err);
    });

    if (opts && opts.onProgress) {
      xhr.addEventListener('progress', opts.onProgress);
    }

    if (opts && opts.onReadyStateChange) {
      xhr.addEventListener('readystatechange', opts.onReadyStateChange);
    }

    xhr.withCredentials = opts.withCredentials;
    xhr.open(method, url);

    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Content-Type', 'application/json');

    for (const key in opts.headers) {
      xhr.setRequestHeader(key, opts.headers[key]);
    }

    if (body) {
      try {
        const json = JSON.stringify(body);
      } catch (e) {
        // abandon the request
        xhr = null;

        return reject({
          error: 'Body must be JSON.'
        });
      }

      xhr.send(JSON.stringify(body));
    } else {
      xhr.send();
    }
  });
}