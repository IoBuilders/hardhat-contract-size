import { task, extendConfig } from "hardhat/config";
import { HardhatPluginError } from "hardhat/plugins";
import {
  HardhatConfig,
  HardhatContractSizeConfig,
  HardhatRuntimeEnvironment,
  HardhatUserConfig,
} from "hardhat/types";

import Table from "cli-table";
import * as fs from "fs";
import * as util from "util";
import pjson from "../package.json";
import { basename } from "path";

import "./type-extensions";

const lstat = util.promisify(fs.lstat);

const PLUGIN_NAME = pjson.name;

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  // Default values
  const configEntry = Object.assign({}, userConfig.contractSize) ?? {};
  const alphaSort = userConfig.contractSize?.alphaSort ?? false;
  const checkMaxSize = userConfig.contractSize?.checkMaxSize ?? false;
  const contracts = userConfig.contractSize?.contracts ?? [];
  const disambiguatePaths = userConfig.contractSize?.disambiguatePaths ?? false;
  const except = userConfig.contractSize?.except ?? [];
  const ignoreMocks = userConfig.contractSize?.ignoreMocks ?? false;
  const runOnCompile = userConfig.contractSize?.runOnCompile ?? false;

  configEntry.alphaSort = alphaSort;
  configEntry.checkMaxSize = checkMaxSize;
  configEntry.contracts = contracts;
  configEntry.disambiguatePaths = disambiguatePaths;
  configEntry.except = except;
  configEntry.ignoreMocks = ignoreMocks;
  configEntry.runOnCompile = runOnCompile;

  // Map to final config
  config.contractSize = configEntry as HardhatContractSizeConfig;
});

const DEFAULT_MAX_CONTRACT_SIZE_IN_KIB = 24;

const isValidCheckMaxSize = (checkMaxSize: boolean): boolean => {
  if (checkMaxSize === undefined) return true;
  return checkMaxSize === true || !Number.isNaN(checkMaxSize);
};

const getContracts = async (hre: HardhatRuntimeEnvironment, contractNames: string[], ignoreMocks: boolean, except: string[]) => {
  const contractsDirectoryListArtifacts = await hre.artifacts.getArtifactPaths();
  const contractsDirectoryListContracts = await hre.artifacts.getAllFullyQualifiedNames();

  contractNames = await getAllContractNames(contractsDirectoryListArtifacts, contractNames, ignoreMocks, except);
  return contractNames.map((contractName: string) => {
    let name = basename(contractName).replace('.json','');
    return {
      file: contractName,
      nameContract: contractsDirectoryListContracts.find(path => path.indexOf(name) !== -1)?.split(':')[0],
      name: name,
    };
  });
};

const getAllContractNames = async (contractsJSON: string[], contractNames: string[], ignoreMocks: boolean, except: string[]) => {
  return contractsJSON.filter((file: string) => {
    if (!file.endsWith('.json')) return false;
    if (contractNames.length && contractNames.some((m) => file.match(m))) return false;
    if (ignoreMocks && file.toLowerCase().endsWith("mock.json")) return false;
    if (except.length && except.some((m) => file.match(m))) return false;
    return true;
  });
};

const checkFile = async (filePath: string) => {
  let stat;

  try {
    stat = await lstat(filePath);
  } catch (error : any) {
    throw new HardhatPluginError(PLUGIN_NAME, `Error while checking file ${filePath}: ${error?.message}`);
  }

  if (!stat.isFile()) {
    throw new HardhatPluginError(PLUGIN_NAME, `Error: ${filePath} is not a valid file`);
  }
};

const formatByteCodeSize = (byteCodeSize: number) => {
  return `${byteCodeSize.toFixed(2)}`;
};

const computeByteCodeSizeInKiB = (byteCode: any) => {
  // -2 to remove 0x from the beginning of the string
  // /2 because one byte consists of two hexadecimal values
  // /1024 to convert to size from byte to kibibytes
  return (byteCode.length - 2) / 2 / 1024;
};

task("contract-size", "Output the size of compiled contracts")
  .addFlag("alphaSort", "Sort table entries in alphabetical order [true | false]")
  .addFlag(
    "checkMaxSize",
    "Check that the smart contracts aren't bigger than the allowed maximum contract size of the Ethereum Mainnet (24 KiB = 24576 bytes)"
  )
  .addFlag("contracts", 'Array of string matchers to determine what contracts to include ["*Mock.sol"]')
  .addFlag("disambiguatePaths", "Wether to output the full path of the artifact")
  .addFlag("except", 'Array of string matchers to determine what contracts to ignore ["ERC20*"]')
  .addFlag("ignoreMocks", 'Wether to ignore contracts that have a name that ends with "Mock"')
  .setAction(async function (args, hre) {
    let { alphaSort, checkMaxSize, contracts, disambiguatePaths, except, ignoreMocks } = hre.config.contractSize;

    alphaSort = !args.alphaSort ? alphaSort : args.alphaSort;
    checkMaxSize = !args.checkMaxSize ? checkMaxSize : args.checkMaxSize;
    contracts = !args.contracts ? contracts : args.contracts;
    disambiguatePaths = !args.disambiguatePaths ? disambiguatePaths : args.disambiguatePaths;
    except = !args.except ? except : args.except;
    ignoreMocks = !args.ignoreMocks ? ignoreMocks : args.ignoreMocks;

    if (!isValidCheckMaxSize(!!checkMaxSize)) {
      throw new HardhatPluginError(PLUGIN_NAME, `--checkMaxSize: invalid value ${checkMaxSize}`);
    }

    const table = new Table({
      head: ["Contract", "Size (KiB)"],
      style: {
        head: ["bold", "white"],
      },
      colWidths: [70, 12],
    });

    const contractList = await getContracts(hre, contracts, ignoreMocks, except);

    const contractPromises = contractList.map(async (contract: any) => {
      // console.log(contract);
      await checkFile(contract.file);

      const contractFile = require(contract.file);

      if (!("deployedBytecode" in contractFile)) {
        throw new HardhatPluginError(PLUGIN_NAME, `Error: deployedBytecode not found in ${contract.file} (it is not a contract json file)`);
      }

      const byteCodeSize = computeByteCodeSizeInKiB(contractFile.deployedBytecode);

      table.push([disambiguatePaths ? contract.nameContract : contract.name, formatByteCodeSize(byteCodeSize)]);
    });

    await Promise.all(contractPromises);

    // If alpha sort
    if (alphaSort) {
      table.sort((a: any, b: any) => (a[0].toUpperCase() > b[0].toUpperCase() ? 1 : -1));
    } else {
      table.sort((a: any, b: any) => a[1] - b[1]);
    }

    console.log(table.toString());

    if (checkMaxSize) {
      const maxSize = checkMaxSize === true ? DEFAULT_MAX_CONTRACT_SIZE_IN_KIB : checkMaxSize;

      table.forEach((row: any[]) => {
        if (Number.parseFloat(row[1]) > maxSize) {
          throw new HardhatPluginError(PLUGIN_NAME, `Contract ${row[0]} is bigger than ${maxSize} KiB`);
        }
      });
    }
  });
