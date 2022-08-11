import { extendConfig } from "hardhat/config";
import { HardhatConfig, HardhatContractSizeConfig, HardhatContractSizeUserConfig, HardhatUserConfig } from "hardhat/types";
import { isGeneratorObject } from "util/types";

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  // Default values
  const defaultValues: HardhatContractSizeUserConfig = {
    sort: "size,asc",
    checkMaxSize: false,
    contracts: [],
    disambiguatePaths: false,
    except: [],
    ignoreMocks: false,
    runOnCompile: true,
    sizeInBytes: false,
  };

  const configEntry = Object.assign({}, userConfig.contractSize) ?? {};
  const sort = userConfig.contractSize?.sort ?? defaultValues.sort;
  const checkMaxSize = userConfig.contractSize?.checkMaxSize ?? defaultValues.checkMaxSize;
  const contracts = userConfig.contractSize?.contracts ?? defaultValues.contracts;
  const disambiguatePaths = userConfig.contractSize?.disambiguatePaths ?? defaultValues.disambiguatePaths;
  const except = userConfig.contractSize?.except ?? defaultValues.except;
  const ignoreMocks = userConfig.contractSize?.ignoreMocks ?? defaultValues.ignoreMocks;
  const runOnCompile = userConfig.contractSize?.runOnCompile ?? defaultValues.runOnCompile;
  const sizeInBytes = userConfig.contractSize?.sizeInBytes ?? defaultValues.sizeInBytes;

  configEntry.sort = sort;
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
