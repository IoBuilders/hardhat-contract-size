import { formatWithThousandSeparator } from "../utils/formatting";

export interface TableContract {
  file: string;
  nameContract: string;
  name: string;
}

export enum SizeUnit {
  Bytes,
  Kibibytes
}