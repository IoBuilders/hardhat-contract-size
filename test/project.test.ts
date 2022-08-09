// tslint:disable-next-line no-implicit-dependencies
import { assert } from "chai";
import { contractSize as exampleContractSizeConfig } from "./fixture-projects/hardhat-project/contract.config";
import { useEnvironment } from "./helpers";

describe("Init Test", function () {
  describe("Hardhat Runtime Environment extension", function () {
    useEnvironment("hardhat-project");

    it("Should add the default configuration to Hardhat Config", function () {
      assert.deepEqual(this.hre.config.contractSize, exampleContractSizeConfig);
    });
  });
});
