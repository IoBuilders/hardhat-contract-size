import { task } from "hardhat/config";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatContractSizeConfig, HardhatRuntimeEnvironment } from "hardhat/types";

import * as fs from "fs";
import * as util from "util";
import { basename } from "path";
import { computeByteCodeSizeInKiB, formatWithThousandSeparator, formatByteCodeSize, convertToByte, formatKiBCodeSize, orderTable, drawTable, PLUGIN_NAME, convertFromByte } from "../utils/formatting";
import colors from "colors";

import "../types/type-extensions";
import { TableContract, TableData } from "../types/types";

const lstat = util.promisify(fs.lstat);
const DEFAULT_MAX_CONTRACT_SIZE_IN_KIB: number = 24;

const isValidCheckMaxSize = (checkMaxSize: boolean | number): boolean => {
  if (checkMaxSize === undefined) return true;
  return checkMaxSize === true || !Number.isNaN(checkMaxSize);
};

const getContracts = async (
  hre: HardhatRuntimeEnvironment,
  contractNames: string[],
  ignoreMocks: boolean,
  except: string[]
): Promise<TableContract[]> => {
  const contractsDirectoryListArtifacts: string[] = await hre.artifacts.getArtifactPaths();
  const contractsDirectoryListContracts: string[] = await hre.artifacts.getAllFullyQualifiedNames();

  contractNames = await applyFilters(contractsDirectoryListArtifacts, contractNames, ignoreMocks, except);
  return contractNames.map((contractName: string) => {
    let name: string = basename(contractName).replace(".json", "");
    return {
      file: contractName,
      nameContract: contractsDirectoryListContracts.find((path) => path.indexOf(name) !== -1)?.split(":")[0] ?? "",
      name: name,
    };
  });
};

const applyFilters = async (
  contractsJSON: string[],
  contractNames: string[],
  ignoreMocks: boolean,
  except: string[]
): Promise<string[]> => {
  return contractsJSON.filter((file: string) => {
    if (!file.endsWith(".json")) return false;
    if (contractNames.length && !contractNames.some((m) => file.match(m))) return false;
    if (ignoreMocks && file.toLowerCase().endsWith("mock.json")) return false;
    if (except.length && except.some((m) => file.match(m))) return false;
    return true;
  });
};

const checkFile = async (filePath: string): Promise<void> => {
  let stat: fs.Stats;
  try {
    stat = await lstat(filePath);
  } catch (error) {
    throw new HardhatPluginError(PLUGIN_NAME, `Error while checking file ${filePath}: ${(error as any)?.message ?? "[unkown]"}`);
  }
  if (!stat.isFile()) {
    throw new HardhatPluginError(PLUGIN_NAME, `Error: ${filePath} is not a valid file`);
  }
};

task("contract-size", "Output the size of compiled contracts")
  .addOptionalParam("sort", "Sort table entries by name or size and ascendant or descendant order [size,asc]")
  .addOptionalParam(
    "checkMaxSize",
    "Check that the smart contracts aren't bigger than the allowed maximum contract size of the Ethereum Mainnet (24 KiB = 24576 bytes)"
  )
  .addOptionalParam("contracts", 'Array of string matchers to determine what contracts to include ["*Mock.sol"]')
  .addFlag("disambiguatePaths", "Wether to output the full path of the artifact")
  .addOptionalParam("except", 'Array of string matchers to determine what contracts to ignore ["ERC20*"]')
  .addFlag("ignoreMocks", 'Wether to ignore contracts that have a name that ends with "Mock"')
  .addFlag("sizeInBytes", "Shows the size of the contracts in Bytes, by default the size is shown in Kib")
  .setAction(async function (args, hre): Promise<void> {
    let {
      sort,
      checkMaxSize,
      contracts,
      disambiguatePaths,
      except,
      ignoreMocks,
      sizeInBytes,
    }: HardhatContractSizeConfig = hre.config.contractSize;

    sort = !args.sort ? sort : args.sort;
    checkMaxSize = !args.checkMaxSize ? checkMaxSize : args.checkMaxSize;
    contracts = !args.contracts ? contracts : args.contracts.split(",");
    disambiguatePaths = !args.disambiguatePaths ? disambiguatePaths : args.disambiguatePaths;
    except = !args.except ? except : args.except.split(",");
    ignoreMocks = !args.ignoreMocks ? ignoreMocks : args.ignoreMocks;
    sizeInBytes = !args.sizeInBytes ? sizeInBytes : args.sizeInBytes;

    if (!isValidCheckMaxSize(!!checkMaxSize)) {
      throw new HardhatPluginError(PLUGIN_NAME, `--checkMaxSize: invalid value ${checkMaxSize}`);
    }

    let tableData: TableData[] = [];

    const contractList: TableContract[] = await getContracts(hre, contracts, ignoreMocks, except);
    let totalKib: number = 0;

    if (contractList.length == 0) throw new HardhatPluginError(PLUGIN_NAME, `There are no compiled contracts to calculate the size.`);

    const contractPromises = contractList.map(async (contract: any) => {
      await checkFile(contract.file);

      const contractFile = require(contract.file);

      if (!("deployedBytecode" in contractFile)) {
        throw new HardhatPluginError(PLUGIN_NAME, `Error: deployedBytecode not found in ${contract.file} (it is not a contract json file)`);
      }

      const kibCodeSize = computeByteCodeSizeInKiB(contractFile.deployedBytecode);
      totalKib += kibCodeSize;

      tableData.push({
        name: disambiguatePaths ? contract.nameContract : contract.name,
        size: sizeInBytes ? formatByteCodeSize(convertToByte(kibCodeSize)) : formatKiBCodeSize(kibCodeSize),
      });
    });

    await Promise.all(contractPromises);

    // Sort tableData
    if (sort && typeof sort === 'string') {
      tableData = orderTable(sort, tableData);
    }

    const table = drawTable(tableData, sizeInBytes, checkMaxSize)

    table.push([
      colors.bold("Total"), 
      formatWithThousandSeparator(sizeInBytes ? formatByteCodeSize(convertToByte(totalKib)) : formatKiBCodeSize(totalKib))
    ]);

    console.log(table.toString());

    if (checkMaxSize) {
      const maxSize: number = checkMaxSize === true ? DEFAULT_MAX_CONTRACT_SIZE_IN_KIB : Number.parseFloat(checkMaxSize.toString());
      let errorMsg: string = '';

      tableData.forEach((row: TableData, index: number): void => {
        let entries: TableData = row as TableData;
        let contractName: string = entries.name ?? "";
        let value: number = Number.parseFloat(entries.size.toString()) ?? 0;
        if ((sizeInBytes ? convertFromByte(value) : value) > maxSize && index !== table.length - 1) {
          errorMsg += `\nContract ${contractName} is bigger than ${maxSize} KiB`;
        }
      });

      if (errorMsg !== '') {
        throw new HardhatPluginError(PLUGIN_NAME, errorMsg);
      }
    }
  });
