import { task } from "hardhat/config";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import Table, { Cell, CrossTableRow, HorizontalTableRow, VerticalTableRow } from "cli-table3";
import * as fs from "fs";
import * as util from "util";
import pjson from "../../package.json";
import { basename } from "path";

import "../types/type-extensions";

const lstat = util.promisify(fs.lstat);

const PLUGIN_NAME = pjson.name;

const DEFAULT_MAX_CONTRACT_SIZE_IN_KIB = 24;
const VALUE_BYTES = 1024;

const isValidCheckMaxSize = (checkMaxSize: boolean): boolean => {
  if (checkMaxSize === undefined) return true;
  return checkMaxSize === true || !Number.isNaN(checkMaxSize);
};

const getContracts = async (hre: HardhatRuntimeEnvironment, contractNames: string[], ignoreMocks: boolean, except: string[]) => {
  const contractsDirectoryListArtifacts = await hre.artifacts.getArtifactPaths();
  const contractsDirectoryListContracts = await hre.artifacts.getAllFullyQualifiedNames();

  contractNames = await getAllContractNames(contractsDirectoryListArtifacts, contractNames, ignoreMocks, except);
  return contractNames.map((contractName: string) => {
    let name = basename(contractName).replace(".json", "");
    return {
      file: contractName,
      nameContract: contractsDirectoryListContracts.find((path) => path.indexOf(name) !== -1)?.split(":")[0],
      name: name,
    };
  });
};

const getAllContractNames = async (contractsJSON: string[], contractNames: string[], ignoreMocks: boolean, except: string[]) => {
  return contractsJSON.filter((file: string) => {
    if (!file.endsWith(".json")) return false;
    if (contractNames.length && !contractNames.some((m) => file.match(m))) return false;
    if (ignoreMocks && file.toLowerCase().endsWith("mock.json")) return false;
    if (except.length && except.some((m) => file.match(m))) return false;
    return true;
  });
};

const checkFile = async (filePath: string) => {
  let stat;

  try {
    stat = await lstat(filePath);
  } catch (error: any) {
    throw new HardhatPluginError(PLUGIN_NAME, `Error while checking file ${filePath}: ${error?.message}`);
  }

  if (!stat.isFile()) {
    throw new HardhatPluginError(PLUGIN_NAME, `Error: ${filePath} is not a valid file`);
  }
};

const formatByteCodeSize = (byteCodeSize: number) => {
  return `${byteCodeSize.toFixed(2)}`;
};

const convertToByte = (valueKib: number) => {
    return valueKib * VALUE_BYTES;
}
  
const formatKiBCodeSize = (kibteCodeSize: number) => {
return `${kibteCodeSize.toFixed(2)} KiB`
}

const computeByteCodeSizeInKiB = (byteCode: any) => {
  // -2 to remove 0x from the beginning of the string
  // /2 because one byte consists of two hexadecimal values
  // /1024 to convert to size from byte to kibibytes
  return (byteCode.length - 2) / 2 / 1024;
};

task("contract-size", "Output the size of compiled contracts")
  .addFlag("alphaSort", "Sort table entries in alphabetical order [true | false]")
  .addOptionalParam(
    "checkMaxSize",
    "Check that the smart contracts aren't bigger than the allowed maximum contract size of the Ethereum Mainnet (24 KiB = 24576 bytes)"
  )
  .addOptionalParam("contracts", 'Array of string matchers to determine what contracts to include ["*Mock.sol"]')
  .addFlag("disambiguatePaths", "Wether to output the full path of the artifact")
  .addOptionalParam("except", 'Array of string matchers to determine what contracts to ignore ["ERC20*"]')
  .addFlag("ignoreMocks", 'Wether to ignore contracts that have a name that ends with "Mock"')
  .addFlag("sizeInBytes", "Shows the size of the contracts in Bytes, by default the size is shown in Kib")
  .setAction(async function (args, hre) {
    let { alphaSort, checkMaxSize, contracts, disambiguatePaths, except, ignoreMocks, sizeInBytes } = hre.config.contractSize;

    alphaSort = !args.alphaSort ? alphaSort : args.alphaSort;
    checkMaxSize = !args.checkMaxSize ? checkMaxSize : args.checkMaxSize;
    contracts = !args.contracts ? contracts : args.contracts.split(',');
    disambiguatePaths = !args.disambiguatePaths ? disambiguatePaths : args.disambiguatePaths;
    except = !args.except ? except : args.except.split(',');
    ignoreMocks = !args.ignoreMocks ? ignoreMocks : args.ignoreMocks;
    sizeInBytes = !args.sizeInBytes ? sizeInBytes : args.sizeInBytes;

    if (!isValidCheckMaxSize(!!checkMaxSize)) {
      throw new HardhatPluginError(PLUGIN_NAME, `--checkMaxSize: invalid value ${checkMaxSize}`);
    }

    const table = new Table({
      head: ["Contract", sizeInBytes ? "Size (Bytes)" : "Size (KiB)"],
      style: {
        head: ["bold", "white"],
      },
      colWidths: [70, sizeInBytes ? 18 : 12],
    });

    const contractList = await getContracts(hre, contracts, ignoreMocks, except);

    let totalKib = 0;

    if (contractList.length == 0) throw new HardhatPluginError(PLUGIN_NAME, `There are no compiled contracts to calculate the size.`);

    const contractPromises = contractList.map(async (contract: any) => {
      await checkFile(contract.file);

      const contractFile = require(contract.file);

      if (!("deployedBytecode" in contractFile)) {
        throw new HardhatPluginError(PLUGIN_NAME, `Error: deployedBytecode not found in ${contract.file} (it is not a contract json file)`);
      }

      const kibCodeSize = computeByteCodeSizeInKiB(contractFile.deployedBytecode);
      totalKib += kibCodeSize;

      table.push([
        disambiguatePaths ? contract.nameContract : contract.name,
        sizeInBytes ? formatByteCodeSize(convertToByte(kibCodeSize)) : formatKiBCodeSize(kibCodeSize),
      ]);
    });

    await Promise.all(contractPromises);

    // If alpha sort
    if (alphaSort) {
      table.sort((a: any, b: any) => (a[0].toUpperCase() > b[0].toUpperCase() ? 1 : -1));
    } else {
      table.sort((a: any, b: any) => a[1] - b[1]);
    }

    table.push(["Total", sizeInBytes ? formatByteCodeSize(convertToByte(totalKib)) : formatKiBCodeSize(totalKib)]);

    console.log(table.toString());

    if (checkMaxSize) {
      const maxSize = checkMaxSize === true ? DEFAULT_MAX_CONTRACT_SIZE_IN_KIB : checkMaxSize;

      table.forEach((row: HorizontalTableRow | VerticalTableRow | CrossTableRow, index: number): void => {
        let entries = row as Cell[];
        let contractName = entries[0]?.valueOf().toString() ?? "";
        let value = entries[1]?.valueOf().toString() ?? "0";
        if (Number.parseFloat(value) > maxSize && index !== table.length - 1) {
          throw new HardhatPluginError(PLUGIN_NAME, `Contract ${contractName} is bigger than ${maxSize} KiB`);
        }
      });
    }
  });
