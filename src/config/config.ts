import { extendConfig } from "hardhat/config";
import {
  HardhatConfig,
  HardhatContractSizeConfig,
  HardhatUserConfig
} from "hardhat/types";

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  // Default values
  const configEntry = Object.assign({}, userConfig.contractSize) ?? {};
  const alphaSort = userConfig.contractSize?.alphaSort ?? false;
  const checkMaxSize = userConfig.contractSize?.checkMaxSize ?? false;
  const contracts = userConfig.contractSize?.contracts ?? [];
  const disambiguatePaths = userConfig.contractSize?.disambiguatePaths ?? false;
  const except = userConfig.contractSize?.except ?? [];
  const ignoreMocks = userConfig.contractSize?.ignoreMocks ?? false;
  const runOnCompile = userConfig.contractSize?.runOnCompile ?? true;
  const sizeInBytes = userConfig.contractSize?.sizeInBytes ?? false;

  configEntry.alphaSort = alphaSort;
  configEntry.checkMaxSize = checkMaxSize;
  configEntry.contracts = contracts;
  configEntry.disambiguatePaths = disambiguatePaths;
  configEntry.except = except;
  configEntry.ignoreMocks = ignoreMocks;
  configEntry.runOnCompile = runOnCompile;
  configEntry.sizeInBytes = sizeInBytes;

  // Map to final config
  config.contractSize = configEntry as HardhatContractSizeConfig;
});
