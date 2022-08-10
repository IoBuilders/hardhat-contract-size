import { VALUE_BYTES } from "../tasks/contract-size";

export const formatByteCodeSize = (byteCodeSize: number) => {
  return `${byteCodeSize.toFixed(2)}`;
};
export const convertToByte = (valueKib: number) => {
  return valueKib * VALUE_BYTES;
};
export const formatKiBCodeSize = (kibteCodeSize: number) => {
  return `${kibteCodeSize.toFixed(2)} KiB`;
};
export const computeByteCodeSizeInKiB = (byteCode: any) => {
  // -2 to remove 0x from the beginning of the string
  // /2 because one byte consists of two hexadecimal values
  // /1024 to convert to size from byte to kibibytes
  return (byteCode.length - 2) / 2 / 1024;
};
