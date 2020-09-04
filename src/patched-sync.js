/**
 * Provides the means to effortlessly keep an object up to date with JSON-Patch
 *
 * @author Joe Mills
 * @module patched-sync
 */

import FetchTransport from "./transports/fetch";
import WebSocketTransport from "./transports/websocket";
import XMLHttpRequestTransport from "./transports/xmlhttprequest";
import jiff from "jiff";

/**
 * Create and manage a patched sync object and connection
 *
 * This class ties all the disparate parts of patched-sync together.
 * It's purpose is to listen to object changes, notify when object changes
 * come in from the server, manage object history, and keep the object
 * up to date (obviously).
 */
export default class PatchedSync {
  /**
   * Constructs a new instance of PatchedSync.
   *
   * @param {*} initial_object The object to be kept in sync.
   * @param {Object} config The configuration to be used to keep the object in sync.
   * @param {String} config.transport The type of transport used to communicate with the server, should be "xmlhttprequest", "fetch", "websocket", or an object that conforms to the transform API.
   * @param {String} config.get_url The URL to use to fetch the server side version of the object, required for "xmlhttprequest" and "fetch" transports.
   * @param {String} config.patch_url The JSON Patch endpoint, required for "xmlhttprequest" and "fetch" transports.
   * @param {String} config.socket_url The web-socket URL if the "websocket" transport is used, required for the "websocket" transport.
   * @param {String} config.fetch_message The message name to use to request and receive the server side version of the object, required for the "websocket" transport.
   * @param {String} config.patch_message The message name to use to send and receive patches from the server, required for the "websocket" transport.
   */
  constructor(config, initial_object) {
    initial_object = initial_object || {};
    this._object = jiff.clone(initial_object) || {};
    this._listeners = {
      "get:start": [],
      "get:end": [],
      "get:error": [],
      "patch:start": [],
      "patch:end": [],
      "patch:error": [],
    };

    this._history = [];
    this._instance_id = makeid(12);

    if (!config) throw new Error("A configuration object is required as the first parameter of the constructor.");

    if (config.transport) {
      if (typeof config.transport === "string") {
        switch (config.transport) {
          case "xmlhttprequest":
            if (!config.get_url) throw new Error("Get URL must be defined (config.get_url)");
            if (!config.patch_url) throw new Error("Patch URL must be defined (config.patch_url)");
            this.transport = new XMLHttpRequestTransport(config.get_url, config.patch_url, config.interval || 30000);
            break;

          case "fetch":
            if (!config.get_url) throw new Error("Get URL must be defined (config.get_url)");
            if (!config.patch_url) throw new Error("Patch URL must be defined (config.patch_url)");
            this.transport = new FetchTransport(config.get_url, config.patch_url, config.interval || 30000);
            break;

          case "websocket":
            if (!config.socket_url) throw new Error("Socket URL must be defined (config.socket_url)");
            if (!config.get_message) throw new Error("Get message name is required (config.get_message)");
            if (!config.patch_message) throw new Error("Patch message name is required (config.patch_message)");
            this.transport = new WebSocketTransport(config.socket_url, config.get_message, config.patch_message);
            break;

          default:
            throw new Error("No transport was defined (config.transport)");
        }
      } else if (typeof config.transport === "object") {
        this.transport = config.transport;
      } else {
        throw new Error("Transport must be either an object or a string.");
      }
    }
  }

  /**
   * Listen to a specific event.
   *
   * Event names are as follows:
   * - `get:start` - Fired when a GET request is sent to the transport.
   * - `get:end` - Fired when a GET request is completed successfully.
   * - `get:error` - Fired when a GET request fails.
   * - `patch:start` - Fired when a PATCH request starts.
   * - `patch:end` - Fired when a PATCH request completes successfully.
   * - `patch:error` - Fired when a PATCH request fails.
   *
   * @param {String} event_name The event name to listen to.
   * @param {String} [path] Currently un-used, but eventually it will allow functions to filter by object path.
   * @param {Function} fn The function to execute on that event.
   */
  on(command, path, fn) {
    if (!fn && typeof path === "function") {
      fn = path;
      path = null;
    }

    fn.listener_key = this._listeners.length + makeid(16);

    if (command === "*" || command === "*:*") {
      this._listeners["get:start"].push(fn);
      this._listeners["get:end"].push(fn);
      this._listeners["patch:start"].push(fn);
      this._listeners["patch:end"].push(fn);
    } else {
      if (command.indexOf(":") === -1) command += ":end";
      this._listeners[command].push(fn);
    }

    return fn.listener_key;
  }

  /**
   * Send a notification for an event type.
   * @param {String} event_name The event name to fire.
   * @param {*} [data] The data from the event, if any.
   */
  notify(event_name, data) {
    data = jiff.clone(data);
    if (!this._listeners[event_name]) return;

    const listeners = this._listeners[event_name];
    for (let index = 0; index < listeners.length; index++) {
      listeners[index](data);
    }
  }

  start() {
    this.transport.start(obj => {
      this._object = obj;
    });
  }

  stop() {
    this.transport.stop();
  }

  async fetch() {
    this.notify("get:start");
    this._object = await this.transport.get();
    this.notify("get:end", this._object);

    return jiff.clone(this._object);
  }

  get() {
    return jiff.clone(this._object);
  }

  /**
   * This method takes an object and assigns it's values to the internal object.
   *
   * This works a lot like `Object.assign` except that it is careful to make sure
   * that nothing is removed with the assignment. The exception here is with arrays.
   * In that case there are some special indicators for push and remove, but otherwise
   * the changes are put in place of the prior object rather than a deep merge as
   * the indexes within arrays are not stable enough to guaruntee we know it hasn't
   * changed and if the changed value was removed, added, or moved.
   *
   * There are also special operations that can be performed on objects and arrays.
   * For objects, you can ensure the removal of an element by using `PatchedSync.DELETE`
   * as the value.  This will be detected and the element of the object will be removed.
   * Note this does not work in arrays.
   *
   * For arrays, you can either pass in a replacement array that is dropped in place
   * of the old array or an object. We don't attempt a merge because it is nearly
   * impossible to determine if an object was changed, removed, or replaced reliably
   * since referential integrity can't be guarunteed.
   * The syntax is as follows:
   *
   * ```javascript
   * {
   *    operations: [
   *      { op: "push", value: Anything },
   *      { op: "splice", index: 1, value: Anything },
   *      { op: "unshift", value: Anything },
   *      { op: "remove", index: 1}
   *    ]
   * }
   * ```
   *
   * These operations map directly to their JavaScript counterparts.
   * So `push` adds a new element to the array at the end, `unshift` pushes a new
   * element in at the beginning, and `splice` adds a new element at the specified
   * index.  The other operation, `remove` also does a splice, but removes the
   * element at that index.
   *
   * @param {Object} obj The object with changes to be applied to the main object.
   */
  async change(obj) {
    this.notify("patch:start");

    const deepChange = (subject, changes) => {
      if (Array.isArray(subject)) {
        if (Array.isArray(changes)) {
          subject = changes;
        } else if (changes.operations) {
          const operations = changes.operations;
          for (let index = 0; index < operations.length; index++) {
            const operation = operations[index];
            switch (operation.op) {
              case "push":
                subject.push(operation.value);
                break;
              case "splice":
                subject.splice(operation.index, 0, operation.value);
                break;
              case "unshift":
                subject.unshift(operation.value);
                break;
              case "remove":
                subject.splice(operation.index, 1);
                break;
            }
          }
        }
      } else if (typeof changes === "object") {
        const keys = Object.keys(changes);
        for (let index = 0; index < keys.length; index++) {
          const key = keys[index];
          const value = changes[key];

          if (subject[key] && typeof value === "object") {
            subject[key] = deepChange(subject[key], value);
          } else {
            switch (value) {
              case PatchedSync.DELETE:
                if (subject[key] !== undefined) {
                  subject[key] = null;
                  delete subject[key];
                }
              default:
                subject[key] = value;
            }
          }
        }
      } else {
        subject = changes;
      }

      return subject;
    };

    const old_object = jiff.clone(this._object);
    this._object = deepChange(this._object, obj);
    const patch = jiff.diff(old_object, this._object);
    this._history.push(patch);

    const server_patch = await this.transport.patch(patch);
    this._object = jiff.patch(server_patch, this._object);

    this.notify("patch:end", this._object);

    return jiff.clone(this._object);
  }

  /**
   * Patch the internal object based on the provided object.
   *
   * This method is expecting the full object to be diffed and patched against the internal object.
   *
   * @param {Object} obj The object to perform the diff and patch on.
   */
  async patch(obj) {
    this.notify("patch:start");
    const patch = jiff.diff(this._object, obj);
    this._history.push(patch);
    this._object = jiff.clone(jiff.patch(patch, this._object));

    const server_patch = await this.transport.patch(patch);
    this._object = jiff.patch(server_patch, this._object);

    this.notify("patch:end", this._object);

    return this._object;
  }

  /**
   * The history of changes made to this object durring the lifetime of this instance.
   * @param {Number} [reverse_index] The 0 based reverse index from the end of the array towards the beginning.
   * @returns {JSONPatch} A JSON Patch formatted array.
   */
  history(reverse_index) {
    if (this._history.length === 0) return null;

    if (!reverse_index) {
      return this._history[0];
    } else {
      return this._history[this._history.length - reverse_index + 1];
    }
  }

  /**
   * Return the full history of changes made.
   * @returns {JSONPatch[]} An array of JSON Patch arrays.
   */
  historyAll() {
    return this._history;
  }
}

const makeid = length => {
  var result = "";
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

PatchedSync.DELETE = "$$__&&__DELETE_$_&_$";
