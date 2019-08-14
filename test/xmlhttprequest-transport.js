import { expect } from "chai";
import Transport from "../src/transports/xmlhttprequest";

describe("Fetch transport", function () {
  describe("construction", function () {
    it("should properly construct a xmlhttprequest transport", function () {
      const transport = new Transport(
        "/fetch/test/1",
        "/fetch/test/1",
        10
      );

      expect(typeof transport.config).to.equal('function');
      expect(typeof transport.get).to.equal('function');
      expect(typeof transport.patch).to.equal('function');
      expect(transport.get_url).to.equal("/fetch/test/1");
      expect(transport.patch_url).to.equal("/fetch/test/1");
      expect(transport.interval).to.equal(10);

      const config = transport._config;
      expect(config.withCredentials).to.equal(true);
    });
  });
});