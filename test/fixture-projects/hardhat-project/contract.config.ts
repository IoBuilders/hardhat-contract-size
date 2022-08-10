import { HardhatContractSizeUserConfig } from "hardhat/types";
import "../../../src/types/type-extensions";

export const contractSize: HardhatContractSizeUserConfig = {
  sort: "size,asc",
  runOnCompile: false,
  disambiguatePaths: false,
  checkMaxSize: false,
  contracts: [],
  except: [],
  ignoreMocks: false,
  sizeInBytes: false
};
