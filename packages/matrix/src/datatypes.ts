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
