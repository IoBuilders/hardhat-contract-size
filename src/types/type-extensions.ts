// If your plugin extends types from another plugin, you should import the plugin here.

// To extend one of Hardhat's types, you need to import the module where it has been defined, and redeclare it.
import "hardhat/types/config";
import "hardhat/types/runtime";

declare module "hardhat/types/config" {
  // We extend the UserConfig type, which represents the config as written
  // by the users. Things are normally optional here.

  // We are creating a new interface for the configuration options of the plugin
  export interface HardhatContractSizeUserConfig {
    alphaSort?: boolean;
    contracts?: Array<string>;
    checkMaxSize?: boolean | number;
    disambiguatePaths?: boolean;
    except?: Array<string>;
    ignoreMocks?: boolean;
    runOnCompile?: boolean;
    sizeInBytes?: boolean;
  }
  // And we extend the HardhatUserConfig
  export interface HardhatUserConfig {
    contractSize?: HardhatContractSizeUserConfig;
  }

  // We also extend the Config type, which represents the configuration
  // after it has been resolved. This is the type used during the execution
  // of tasks, tests and scripts.
  export interface HardhatContractSizeConfig {
    alphaSort: boolean;
    contracts: Array<string>;
    checkMaxSize: boolean | number;
    disambiguatePaths: boolean;
    except: Array<string>;
    ignoreMocks: boolean;
    runOnCompile: boolean;
    sizeInBytes: boolean;
  }
  export interface HardhatConfig {
    contractSize: HardhatContractSizeConfig;
  }
}
