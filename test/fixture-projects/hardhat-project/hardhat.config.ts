// We load the plugin here.
import { HardhatUserConfig } from "hardhat/types";

import "../../../src/index";

const config: HardhatUserConfig = {
  solidity: "0.7.3",
  defaultNetwork: "hardhat",
  contractSize: {
    alphaSort: false,
    runOnCompile: false,
    disambiguatePaths: false,
  }
};

export default config;
