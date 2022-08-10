import { SizeUnit } from "../types/types";
import { formatWithThousandSeparator } from "../utils/formatting";

export default class Size {
  private VALUE_BYTES: number = 1024;
  private value: number;
  private format: SizeUnit;

  constructor(_value: number, _format: SizeUnit) {
    this.format = _format;
    this.value = _value;
  }

  exec(byteFn: Function, kibFn: Function): any {
    switch (this.format) {
      case SizeUnit.Bytes:
        return byteFn();
      case SizeUnit.Kibibytes:
        return kibFn();
      default:
        throw new Error("Invalid format for value");
    }
  }

  getValue(): number {
    return this.value;
  }

  getValueFormatted(): string {
    return this.exec(
      () => {
        return formatWithThousandSeparator(this.value.toFixed(0));
      },
      () => {
        return formatWithThousandSeparator(this.getValueInKib().toFixed(2));
      }
    );
  }

  getValueInKib(): number {
    return this.value / this.VALUE_BYTES;
  }
}
