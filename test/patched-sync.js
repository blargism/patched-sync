import { expect } from "chai";
import PatchedSync from "../src/patched-sync";
import TestTransport from "./mocks/test-transport";
import FetchTransport from "../src/transports/fetch";
import WebsocketTransport from "../src/transports/websocket";
import XMLHttpRequestTransport from "../src/transports/xmlhttprequest";

describe("PatchedSync", function () {
  describe("object construction and configuration", function () {
    it("should construct a valid PatchedSync object", function () {
      const transport = new TestTransport();
      const patched_sync = new PatchedSync({
        transport: transport
      });

      expect(patched_sync).to.exist;
      expect(patched_sync.transport).to.equal(transport);

      // ensure API consistency
      expect(typeof patched_sync.on).to.equal('function');
      expect(typeof patched_sync.notify).to.equal('function');
      expect(typeof patched_sync.patch).to.equal('function');
      expect(typeof patched_sync.get).to.equal('function');
      expect(typeof patched_sync.fetch).to.equal('function');
      expect(typeof patched_sync.history).to.equal('function');
      expect(typeof patched_sync.change).to.equal('function');
    });

    it("should construct a valid PatchedSync object using fetch", function () {
      const patched_sync = new PatchedSync({
        transport: "fetch",
        get_url: "/fake/get/url",
        patch_url: "/fake/page/url",
        interval: 10000
      });

      expect(patched_sync).to.exist;
      expect(patched_sync.transport instanceof FetchTransport).to.be.true;
    });

    it("should construct a valid PatchedSync object using websocket", function () {
      const patched_sync = new PatchedSync({
        transport: "websocket",
        socket_url: "/fake/socket/url",
        get_message: "get_message",
        patch_message: "patch_message"
      });

      expect(patched_sync).to.exist;
      expect(patched_sync.transport instanceof WebsocketTransport).to.be.true;
    });

    it("should construct a valid PatchedSync object using XMLHttpRequest", function () {
      const patched_sync = new PatchedSync({
        transport: "xmlhttprequest",
        get_url: "/fake/get/url",
        patch_url: "/fake/page/url",
        interval: 10000
      });

      expect(patched_sync).to.exist;
      expect(patched_sync.transport instanceof XMLHttpRequestTransport).to.be.true;
    });
  });

  describe("patch", function () {
    it("create a patch from the internal object against the provided object", async function () {
      const transport = new TestTransport(null, () => {
        return [
          { op: "add", path: "/b", value: "not b" }
        ]
      });

      const patcher = new PatchedSync({
        transport: transport
      }, {
          a: 'a',
          b: 'b',
          c: 'c',
        });

      let item = patcher.get();

      expect(item.a).to.equal('a');

      item = await patcher.patch({
        a: 'not a'
      });

      expect(item.a).to.equal('not a');
      expect(item.b).to.equal("not b");
      expect(item.c).to.not.exist;
    });

    it("create a patch from the internal object against the provided object with updates from the transport", async function () {
      const transport = new TestTransport(null, () => {
        return [
          { op: "test", path: "/b", value: "something not returned" },
          { op: "replace", path: "/b", value: "not b" }
        ]
      });

      const patcher = new PatchedSync({
        transport: transport
      }, {
          a: 'a',
          b: 'b',
          c: 'c',
        });

      let item = patcher.get();

      expect(item.a).to.equal('a');

      item = await patcher.patch({
        a: 'not a',
        b: 'something not returned',
        c: 'c',
      });

      expect(item.a).to.equal('not a');
      expect(item.b).to.equal("not b");
      expect(item.c).to.equal("c");
    });
  });

  describe("change", function () {
    it("should accept simple changes to an object", async function () {
      const transport = new TestTransport();
      const patcher = new PatchedSync({
        transport: transport
      }, {
          a: 'a',
          b: 'b',
          c: 'c',
        });

      const changes = { a: 'not a' };

      const item = await patcher.change(changes);

      expect(item.a).to.equal('not a');
      expect(item.b).to.equal('b');
      expect(item.c).to.equal('c');
    });

    it("should accept deeply nested changes to an object", async function () {
      const transport = new TestTransport();
      const patcher = new PatchedSync({
        transport: transport
      }, {
          a: 'a',
          b: {
            a: 'a',
            b: {
              a: 'a',
              b: 'b',
              c: 'c',
            }
          },
          c: 'c',
        });

      const changes = {
        b: {
          b: {
            a: 'not a',
          },
          c: 'c',
        }
      };

      const item = await patcher.change(changes);

      expect(item.a).to.equal('a');
      expect(item.b.a).to.equal('a');
      expect(item.b.c).to.equal('c')
      expect(item.b.b.a).to.equal('not a');
      expect(item.b.b.b).to.equal('b');
      expect(item.b.b.c).to.equal('c');
    });

    it("should accept deeply nested changes to an object with server side changes also applied", async function () {
      const transport = new TestTransport(null, (patch) => {
        return [
          { op: "add", path: "/b/b/d", value: "d" },
          { op: "test", path: "/b/b/b", value: "b" },
          { op: "replace", path: "/b/b/b", value: "not b" }
        ];
      });

      const patcher = new PatchedSync({
        transport: transport
      }, {
          a: 'a',
          b: {
            a: 'a',
            b: {
              a: 'a',
              b: 'b',
              c: 'c',
            }
          },
          c: 'c',
        });

      const changes = {
        b: {
          b: {
            a: 'not a',
          },
          c: 'c',
        },
      };

      const item = await patcher.change(changes);
      console.log(item);

      expect(item.a).to.equal('a');
      expect(item.b.a).to.equal('a');
      expect(item.b.c).to.equal('c')
      expect(item.b.b.a).to.equal('not a');
      expect(item.b.b.b).to.equal('not b');
      expect(item.b.b.c).to.equal('c');
      expect(item.b.b.d).to.equal('d');
    });

    it("should process an array push operation", async function () {
      const transport = new TestTransport();

      const patcher = new PatchedSync({
        transport: transport,
      }, {
          a: 'a',
          b: [
            'a',
            'b',
            'c',
          ],
        });

      const item = await patcher.change({
        a: 'not a',
        b: {
          operations: [
            { op: "push", value: "d" }
          ]
        }
      });

      expect(item.a).to.equal("not a");
      expect(item.b.length).to.equal(4);
      expect(item.b[3]).to.equal("d");
    });

    it("should process an array unshift operation", async function () {
      const transport = new TestTransport();

      const patcher = new PatchedSync({
        transport: transport,
      }, {
          a: 'a',
          b: [
            'a',
            'b',
            'c',
          ],
        });

      const item = await patcher.change({
        a: 'not a',
        b: {
          operations: [
            { op: "unshift", value: "before a" }
          ]
        }
      });

      expect(item.a).to.equal("not a");
      expect(item.b.length).to.equal(4);
      expect(item.b[0]).to.equal("before a");
    });

    it("should process an array splice operation", async function () {
      const transport = new TestTransport();

      const patcher = new PatchedSync({
        transport: transport,
      }, {
          a: 'a',
          b: [
            'a',
            'b',
            'c',
          ],
        });

      const item = await patcher.change({
        a: 'not a',
        b: {
          operations: [
            { op: "splice", index: 2, value: "after b" }
          ]
        }
      });

      expect(item.a).to.equal("not a");
      expect(item.b.length).to.equal(4);
      expect(item.b[2]).to.equal("after b");
    });

    it("should process an array remove operation", async function () {
      const transport = new TestTransport();

      const patcher = new PatchedSync({
        transport: transport,
      }, {
          a: 'a',
          b: [
            'a',
            'b',
            'c',
          ],
        });

      const item = await patcher.change({
        a: 'not a',
        b: {
          operations: [
            { op: "remove", index: 1 }
          ]
        }
      });

      expect(item.a).to.equal("not a");
      expect(item.b.length).to.equal(2);
      expect(item.b[1]).to.equal("c");
    });
  });

  describe("listen and notify", function () {
    it("should fire an event on get:end", function (done) {
      const transport = new TestTransport();

      const patcher = new PatchedSync({
        transport: transport,
      }, { a: 'a' });

      patcher.on("get", () => {
        done();
      });

      patcher.fetch();
    });

    it("should fire an event on get:start", function (done) {
      const transport = new TestTransport();

      const patcher = new PatchedSync({
        transport: transport,
      }, { a: 'a' });

      patcher.on("get:start", () => {
        done();
      });

      patcher.fetch();
    });

    it("should fire an event on patch:end", function (done) {
      const transport = new TestTransport();

      const patcher = new PatchedSync({
        transport: transport,
      }, { a: 'a' });

      patcher.on("patch", () => {
        done();
      });

      patcher.change({ a: 'not a' });
    });

    it("should fire an event on patch:start", function (done) {
      const transport = new TestTransport();

      const patcher = new PatchedSync({
        transport: transport,
      }, { a: 'a' });

      patcher.on("patch:start", () => {
        done();
      });

      patcher.change({ a: 'not a' });
    });

    it("should fire all events for *", function (done) {
      let count = 0;
      const counter = () => {
        count++;
        if (count === 4) done();
      };

      const transport = new TestTransport();

      const patcher = new PatchedSync({
        transport: transport,
      }, { a: 'a' });

      patcher.on("patch:start", () => counter());
      patcher.on("patch:end", () => counter());
      patcher.on("get:start", () => counter());
      patcher.on("get:end", () => counter());

      patcher.fetch();
      patcher.change({ a: 'not a' });
    });
  });
});