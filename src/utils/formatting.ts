import Table from "cli-table3";
import { TableData } from "../types/types";
import { HardhatPluginError } from "hardhat/plugins";
import { Cell, CrossTableRow, HorizontalTableRow, VerticalTableRow } from "cli-table3";
import lodash, { Many } from "lodash";
import pjson from "../../package.json";
import colors from "colors";

export const PLUGIN_NAME: string = pjson.name;

export const VALUE_BYTES: number = 1024;
const DEFAULT_MAX_CONTRACT_SIZE_IN_KIB: number = 24;

export const formatWithThousandSeparator = (value: number | string) => {
  return (typeof value === 'number' ? value.toString() : value).replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}
export const formatByteCodeSize = (byteCodeSize: number): number => {
  return Number.parseFloat(byteCodeSize.toFixed(0));
};
export const convertToByte = (valueKib: number): number => {
  return valueKib * VALUE_BYTES;
};
export const convertFromByte = (valueBytes: number): number => {
  return valueBytes / VALUE_BYTES;
};
export const formatKiBCodeSize = (kibteCodeSize: number): number => {
  return Number.parseFloat(kibteCodeSize.toFixed(2));
};
export const computeByteCodeSizeInKiB = (byteCode: any): number => {
  // -2 to remove 0x from the beginning of the string
  // /2 because one byte consists of two hexadecimal values 
  // /1024 to convert to size from byte to kibibytes
  return (byteCode.length - 2) / 2 / 1024;
};
export const drawTable = (data: TableData[], sizeInBytes: boolean, checkMaxSize: number | boolean): Table.Table => {
  const maxSize: number = checkMaxSize === true ? DEFAULT_MAX_CONTRACT_SIZE_IN_KIB : Number.parseFloat(checkMaxSize.toString());
  const table: Table.Table = new Table({
    head: ["Contract", sizeInBytes ? "Size (Bytes)" : "Size (KiB)"],
    style: {
      head: ["bold", "white"],
    },
    colWidths: [70, sizeInBytes ? 18 : 12],
    colAligns: ["left", "right"],
  });

  data.forEach(row => {
    const { name, size } = row;
    table.push([
      name,
      size
    ]);
  });

  return colorFromSize(maxSize, table, sizeInBytes);
};
export const orderTable = (sort: string, tableData: TableData[]): TableData[] => {
  const getSorting = (sort: string): Many<boolean | "asc" | "desc"> => {
    return sort === 'desc' ? 'desc' : 'asc'
  };

  let sortOptions: string[] = sort.split(',');
  const type: string = sortOptions[0] ?? 'size';
  const order: Many<boolean | "asc" | "desc"> = getSorting(sortOptions[1]);

  if (!type && !order) {
    tableData = lodash.orderBy(tableData, 'size', 'asc'); // Default order
    throw new HardhatPluginError(PLUGIN_NAME, 'Warning: sort default by name and asc.');
  }

  if (type !== 'name' && type !== 'size' && (order === 'asc' || order === 'desc')) {
    tableData = lodash.orderBy(tableData, 'size', order);
    throw new HardhatPluginError(PLUGIN_NAME, 'Warning: invalid value sort (valid values name or size).');
  }

  if (order !== 'asc' && order !== 'desc' && (type !== 'name')) {
    tableData = lodash.orderBy(tableData, type, 'asc');
    throw new HardhatPluginError(PLUGIN_NAME, 'Warning: invalid value order (valid values asc or desc).');
  }

  tableData = lodash.orderBy(tableData, type, order);
  return tableData;
};
export const colorFromSize = (maxSize: number, table: Table.Table, sizeInBytes: boolean): Table.Table => {
  const getCellValueAsString = (cellValue: Cell): string => {
    return cellValue?.valueOf().toString() ?? "";
  };
  table.map((row: HorizontalTableRow | VerticalTableRow | CrossTableRow)  => {
    let entries: Cell[] = row as Cell[];
    let sizeTable = Number.parseFloat(getCellValueAsString(entries[1]));
    const size: number = sizeInBytes ? convertFromByte(sizeTable) : sizeTable;
    const percentage80: number = (maxSize * 0.8);
    const name: string = getCellValueAsString(entries[0]);
    let sizeFormatted = formatWithThousandSeparator(sizeTable);
    
    if (size <= percentage80) {
      entries[0] = colors.green(name);
      entries[1] = colors.green(sizeFormatted);
    }
    if (size > percentage80 && size <= maxSize) {
      entries[0] = colors.yellow(name);
      entries[1] = colors.yellow(sizeFormatted);
    }
    if (size > maxSize) {
      entries[0] = colors.red(name);
      entries[1] = colors.red(sizeFormatted);
    }
  });
  return table;
};