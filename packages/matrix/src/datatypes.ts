export interface EncodedData {
  data1: number[]
  data10: number[]
  data27: number[]
}

export interface QRData {
  version: number
  blocks: number[][]
  dataLength: number
  ec: number[][] | Array<Buffer>
  ecLength: number
  ecLevel: EcLevel
}

export enum EcLevel {
  'L',
  'M',
  'Q',
  'H',
}

export const Encoding = {
  Numeric: [0, 0, 0, 1],
  Alphanumeric: [0, 0, 1, 0],
  Byte: [0, 1, 0, 0],
  // currently the following encodings are not supported
  Kanji: [1, 0, 0, 0],
  StructuredAppend: [0, 0, 1, 1],
  ECI: [0, 1, 1, 1],
  FNC1FirstPosition: [0, 1, 0, 1],
  FNC1SecondPosition: [1, 0, 0, 1],
  EndOfMessage: [0, 0, 0, 0],
}
