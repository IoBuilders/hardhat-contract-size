
export const VALUE_BYTES: number = 1024;

export const formatByteCodeSize = (byteCodeSize: number) : string => {
  return `${byteCodeSize.toFixed(2)}`;
};
export const convertToByte = (valueKib: number) : number => {
  return valueKib * VALUE_BYTES;
};
export const formatKiBCodeSize = (kibteCodeSize: number) : string => {
  return `${kibteCodeSize.toFixed(2)} KiB`;
};
export const computeByteCodeSizeInKiB = (byteCode: any) : number => {
  // -2 to remove 0x from the beginning of the string
  // /2 because one byte consists of two hexadecimal values
  // /1024 to convert to size from byte to kibibytes
  return (byteCode.length - 2) / 2 / 1024;
};
