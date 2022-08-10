export const formatWithThousandSeparator = (value: number | string) => {
  return (typeof value === 'number' ? value.toString() : value).replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

export const computeByteCodeSizeInBytes = (byteCode: any): number => {
  // -2 to remove 0x from the beginning of the string
  // /2 because one byte consists of two hexadecimal values 
  return (byteCode.length - 2) / 2 ;
};