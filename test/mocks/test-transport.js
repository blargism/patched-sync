/**
 * A transport for use within unit tests.
 *
 * @author Joe Mills
 * @module test/mocks/test-transport
 */

export default class TestTransport {
  constructor(get_fn, patch_fn) {
    if (get_fn) {
      this.get_fn = get_fn.bind(this);
    } else {
      this.get_fn = function () { return []; };
    }

    if (patch_fn) {
      this.patch_fn = patch_fn.bind(this);
    } else {
      this.patch_fn = function () { return []; };
    }
  }

  async patch(patch) {
    //console.log("Test patch: ", JSON.stringify(patch, null, 2));

    return this.patch_fn(patch);
  }

  async get() {
    return this.get_fn();
  }
}