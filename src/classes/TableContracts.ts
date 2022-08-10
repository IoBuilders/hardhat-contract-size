import { HardhatPluginError } from "hardhat/plugins";
import lodash, { Many, isBoolean } from "lodash";
import { Cell, CrossTableRow, HorizontalTableRow, VerticalTableRow } from "cli-table3";
import Table from "cli-table3";
import { SizeUnit } from "./../types/types";
import Size from "../classes/Size";
import colors from "colors";
import { PLUGIN_NAME } from "../tasks/contract-size";

export const DEFAULT_MAX_CONTRACT_SIZE_IN_KIB: number = 24;

export interface TableData {
  size: Size;
  name: string;
}

export default class TableContracts {
  private data: TableData[];
  private total: Cell[];
  private format: SizeUnit;
  private maxSize: number;
  private checkMaxSize: boolean;

  constructor(
    data: TableData[],
    sort: string,
    format: SizeUnit = SizeUnit.Bytes,
    maxSize: number | boolean = DEFAULT_MAX_CONTRACT_SIZE_IN_KIB
  ) {
    this.data = this.orderTable(sort, data);
    this.format = format;
    this.total = this.calculateTotal();
    this.maxSize = !isBoolean(maxSize) && maxSize !== 0 ? maxSize : DEFAULT_MAX_CONTRACT_SIZE_IN_KIB;
    this.checkMaxSize = !!maxSize;
  }

  public getData() {
    return this.data;
  }

  public getRowByContract(contract: string): TableData {
    return this.data.filter((x: TableData) => x.name === contract)[0];
  }

  public getTotal(): Cell[] {
    return this.total;
  }

  private calculateTotal(): Cell[] {
    let totalSize = this.data.map((x) => x.size.getValue()).reduce((prev, curr) => (prev += curr));
    return [colors.white(colors.bold("Total")), colors.white(new Size(totalSize, this.format).getValueFormatted())];
  }

  private isLastRow(index: number): boolean {
    return index === this.data.length;
  }

  private orderTable(sort: string, tableData: TableData[]): TableData[] {
    const getSorting = (sort: string): Many<boolean | "asc" | "desc"> => {
      return sort === "desc" ? "desc" : "asc";
    };
    if (!sort) return tableData;

    let sortOptions: string[] = sort.split(",");
    const type: string = sortOptions[0] ?? "size";
    const order: Many<boolean | "asc" | "desc"> = getSorting(sortOptions[1]);
    const getTypeOrderVal = (x: TableData) => x.size.getValue();

    if (!type && !order) {
      throw new HardhatPluginError(PLUGIN_NAME, "Warning: sort default by name and asc.");
    }

    if (type !== "name" && type !== "size") {
      throw new HardhatPluginError(PLUGIN_NAME, "Warning: invalid value sort (valid values name or size).");
    }

    if (order !== "asc" && order !== "desc") {
      throw new HardhatPluginError(PLUGIN_NAME, "Warning: invalid value order (valid values asc or desc).");
    }

    tableData = lodash.orderBy(tableData, type === "name" ? type : getTypeOrderVal, order);
    return tableData;
  }

  public drawTable(): void {
    let isInBytes = this.format === SizeUnit.Bytes;
    // Define data config
    const table: Table.Table = new Table({
      head: ["Contract", isInBytes ? "Size (Bytes)" : "Size (KiB)"],
      style: {
        head: ["bold", "white"],
      },
      colWidths: [70, isInBytes ? 18 : 12],
      colAligns: ["left", "right"],
    });

    // Add data rows
    this.data.forEach((row) => {
      const { name, size } = row;
      table.push([name, size.getValueFormatted()]);
    });

    // Add Total row
    table.push(this.total);

    // Output
    console.log(this.colorFromSize(table).toString());

    // Output Max Size For Contracts
    this.checkContractsMaxSize();
  }

  private checkContractsMaxSize(): void {
    if (!this.checkMaxSize) return;
    let errorMsg: string = "";

    this.data.forEach((row: TableData, index: number): void => {
      if (row.size.getValueInKib() > this.maxSize && !this.isLastRow(index)) {
        if (index === 0) {
          errorMsg += "\n";
        }
        errorMsg += `\n\tContract ${row.name ?? ""} is bigger than ${this.maxSize} KiB`;
      }
    });

    if (errorMsg !== "") {
      throw new HardhatPluginError(PLUGIN_NAME, errorMsg);
    }
  }

  private colorFromSize = (table: Table.Table): Table.Table => {
    const getCellValueAsString = (cellValue: Cell): string => {
      return cellValue?.valueOf().toString() ?? "";
    };

    if (!this.checkMaxSize) return table;

    table.map((row: HorizontalTableRow | VerticalTableRow | CrossTableRow, index: number) => {
      let entries: Cell[] = row as Cell[];
      const percentage80: number = this.maxSize * 0.8;

      // Don't format the "Total" row
      if (this.isLastRow(index)) {
        return row;
      }

      let { name, size }: TableData = this.getRowByContract(getCellValueAsString(entries[0]));
      let sizeFormatted = size.getValueFormatted();

      if (size.getValueInKib() <= percentage80) {
        entries[0] = colors.green(name);
        entries[1] = colors.green(sizeFormatted);
      }
      if (size.getValueInKib() > percentage80 && size.getValueInKib() <= this.maxSize) {
        entries[0] = colors.yellow(name);
        entries[1] = colors.yellow(sizeFormatted);
      }
      if (size.getValueInKib() > this.maxSize) {
        entries[0] = colors.red(name);
        entries[1] = colors.red(sizeFormatted);
      }
    });
    return table;
  };
}
