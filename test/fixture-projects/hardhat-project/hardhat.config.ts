// We load the plugin here.
import { HardhatUserConfig } from "hardhat/types";

import "../../../src/index";
import { contractSize } from "./contract.config";

const config: HardhatUserConfig = {
  solidity: "0.7.3",
  defaultNetwork: "hardhat",
  contractSize: contractSize
};

export default config;
