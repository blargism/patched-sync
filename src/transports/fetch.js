/**
 * A transport using fetch.
 *
 * @author Joe Mills
 * @module transports/fetch
 */

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

/**
 * A patched-sync transport that wraps fetch.
 */
export default class FetchTransport {
  /**
   * Construct a new FetchTransport.
   *
   * @param {String} get_url The GET URL to get the initial object.
   * @param {String} patch_url The PATCH URL to set patches to the server.
   * @param {Number} [interval] The interval in which to check for updates from the GET URL. If this is null or 0 it will be set to 30000 ms.
   */
  constructor(get_url, patch_url, interval) {
    this.get_url = get_url;
    this.patch_url = patch_url;
    this.interval = interval || 30000;

    this._config = {
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow",
      referrer: "no-referrer",
    };
  }

  /**
   * Set config options for fetch.
   * @param {Object} config The parameters to update within fetch.
   * @param {String} [config.mode] The CORS mode.
   * @param {String} [config.cache] The cache setting.
   * @param {String} [config.credentials] The credentials setting.
   * @param {String} [config.redirect] The redirect setting.
   * @param {String} [config.referrer] The referrer setting.
   * @param {Object} [config.headers] An object filled with key-value pairs to add as headers.
   */
  config(config) {
    if (config.mode) this._config.mode = config.mode;
    if (config.cache) this._config.cache = config.cache;
    if (config.credentials) this._config.credentials = config.credentials;
    if (config.redirect) this._config.redirect = config.redirect;
    if (config.referrer) this._config.referrer = config.referrer;
    if (config.headers) this._config.headers = Object.assign({}, this._config.headers, config.headers);
  }

  /**
   * Perform a GET request on the configured URL.
   *
   * The config object is not required and falls back to the defaults or the values provided to the `config` method.
   *
   * @param {Object} config The parameters to update within fetch.
   * @param {String} config.mode The CORS mode.
   * @param {String} config.cache The cache setting.
   * @param {String} config.credentials The credentials setting.
   * @param {String} config.redirect The redirect setting.
   * @param {String} config.referrer The referrer setting.
   * @param {Object} config.headers An object filled with key-value pairs to add as headers.
   */
  get(config) {
    if (!config) config = {};
    return fetch(this.get_url, {
      method: "GET",
      mode: config.mode,
      cache: config.cache,
      credentials: config.credentials,
      headers: Object.assign({}, config.headers, DEFAULT_HEADERS),
      redirect: config.redirect,
      referrer: config.referrer,
    }).then(res => res.json());
  }

  /**
   * Perform a JSON Patch request on the configured URL.
   *
   * The config object is not required and falls back to the defaults or the values provided to the `config` method.
   *
   * @param {Object[]} patch The JSON Patch formatted changes to be sent to the server.
   * @param {Object} config The parameters to update within fetch.
   * @param {String} config.mode The CORS mode.
   * @param {String} config.cache The cache setting.
   * @param {String} config.credentials The credentials setting.
   * @param {String} config.redirect The redirect setting.
   * @param {String} config.referrer The referrer setting.
   * @param {Object} config.headers An object filled with key-value pairs to add as headers.
   */
  patch(patch, config) {
    if (!config) config = this._config;
    return fetch(this.patch_url, {
      method: "PATCH",
      mode: config.mode,
      cache: config.cache,
      credentials: config.credentials,
      headers: Object.assign({}, config.headers, DEFAULT_HEADERS),
      redirect: config.redirect,
      referrer: config.referrer,
      body: JSON.stringify(patch),
    }).then(res => res.json());
  }

  start(fn) {
    this._interval = setInterval(async () => {
      const obj = await this.get();
      fn(obj);
    }, this.interval);
  }

  stop() {
    clearInterval(this._interval);
  }
}
