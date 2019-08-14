import { expect } from "chai";
import FetchTransport from "../src/transports/fetch";
import sinon from "sinon";

describe("Fetch transport", function () {
  describe("construction", function () {
    it("should properly construct a fetch transport", function () {
      const transport = new FetchTransport(
        "/fetch/test/1",
        "/fetch/test/1",
        10
      );

      expect(typeof transport.config).to.equal('function');
      expect(typeof transport.get).to.equal('function');
      expect(typeof transport.patch).to.equal('function');
      expect(typeof transport.start).to.equal('function');
      expect(typeof transport.stop).to.equal('function');
      expect(transport.get_url).to.equal("/fetch/test/1");
      expect(transport.patch_url).to.equal("/fetch/test/1");
      expect(transport.interval).to.equal(10);

      const config = transport._config;
      expect(config.mode).to.equal("cors");
      expect(config.cache).to.equal("no-cache");
      expect(config.credentials).to.equal("same-origin");
      expect(config.headers["Content-Type"]).to.equal("application/json");
      expect(config.redirect).to.equal("follow");
      expect(config.referrer).to.equal("no-referrer");
    });
  });
});