import { EncodedData, Encoding } from './datatypes'

/**
 * Encodes a character and pushes the results onto an array.
 * @param arr - The target array to push onto.
 * @param size - The size of the charater to encode.
 * @param value - The charater to encode.
 */
function pushBits(arr: number[], size: number, value: number): void {
  for (let bit = 1 << (size - 1); bit; bit >>>= 1) {
    arr.push(bit & value ? 1 : 0)
  }
}

/**
 * Packs encoded data into an element containing encoding and length information. The resulting array is `[Encoding:4] [Length:variable] [Data:variable]`
 * @param encoding - The encoding to use.
 * @param length - The length of the data.
 * @param size - The size of one character.
 * @param bits - The data to work on.
 * @returns The packed data, encoding and length information.
 */
function getData(encoding: number[], length: number, size: number, bits: number[]): number[] {
  const d = encoding.slice()
  pushBits(d, size, length)
  return d.concat(bits)
}

/**
 * Encodes 8bit binary data.
 * @param data - Binary data to encode, 8 bits/character.
 * @returns The encoded data for all versions.
 */
function encodeByte(data: number[]): EncodedData {
  const encoding = Encoding.Byte
  const length = data.length
  const bits: number[] = []
  const result: EncodedData = {
    DataVersionLow: [],
    DataVersionMid: [],
    DataVersionHigh: [],
  }

  // encode characters one by one, 8 bits
  for (let i = 0; i < length; i++) {
    pushBits(bits, 8, data[i])
  }

  result.DataVersionHigh = getData(encoding, length, 16, bits)
  result.DataVersionMid = result.DataVersionHigh
  if (length < 256) {
    result.DataVersionLow = getData(encoding, length, 8, bits)
  }
  return result
}

/**
 * Encodes alphanumeric data. Only 45 characters are valid and must be checked beforehand.
 * @param data - Alphanumeric data to encode, valid characters are `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:`
 * @returns The encoded data for all versions.
 */
function encodeAlphanumeric(data: string): EncodedData {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'
  const encoding = Encoding.Alphanumeric
  const length = data.length
  const bits: number[] = []
  const result: EncodedData = {
    DataVersionLow: [],
    DataVersionMid: [],
    DataVersionHigh: [],
  }

  // encode 2 characters, 10 bits, 5.5 bits/character
  // or 1 character, 6 bits
  for (let i = 0; i < length; i += 2) {
    let size = 6
    let value = charset.indexOf(data[i])

    if (data[i + 1]) {
      size = 11
      value = 45 * value + charset.indexOf(data[i + 1])
    }
    pushBits(bits, size, value)
  }

  result.DataVersionHigh = getData(encoding, length, 13, bits)
  if (length < 2048) {
    result.DataVersionMid = getData(encoding, length, 11, bits)
  }
  if (length < 512) {
    result.DataVersionLow = getData(encoding, length, 9, bits)
  }
  return result
}

/**
 * Encodes numeric data.
 * @param data - Numeric data to encode.
 * @returns The encoded data for all versions.
 */
function encodeNumeric(data: string): EncodedData {
  const encoding = Encoding.Numeric
  const length = data.length
  const bits: number[] = []
  const result: EncodedData = {
    DataVersionLow: [],
    DataVersionMid: [],
    DataVersionHigh: [],
  }

  // encode 3 characters at once, 10 bits, 3.3 bits/character
  for (let i = 0; i < length; i += 3) {
    const s = data.substr(i, 3)
    const b = Math.ceil((length * 10) / 3)
    pushBits(bits, b, parseInt(s, 10))
  }

  result.DataVersionHigh = getData(encoding, length, 14, bits)
  if (length < 4096) {
    result.DataVersionMid = getData(encoding, length, 12, bits)
  }
  if (length < 1024) {
    result.DataVersionLow = getData(encoding, length, 10, bits)
  }
  return result
}

/**
 * Encode a single URL (experimental). The protocol and hostname (e.g. `https://github.com/`) are treated like alphanumeric data to save space, the following path is treated like binary data.
 * @param data - The URL to encode.
 * @returns The encoded data for all versions.
 */
function encodeUrl(data: string): EncodedData {
  // first encode protocol and hostname as alphanumeric to save space (2 chars at once)
  const slash = data.indexOf('/', 8) + 1 || data.length
  const result = encode(data.slice(0, slash).toUpperCase(), false)

  if (slash >= data.length) {
    return result
  }

  // then encode path als binary data, as it could contain invalid characters for alphanumeric encoding
  const pathResult = encode(data.slice(slash), false)

  result.DataVersionHigh = result.DataVersionHigh.concat(pathResult.DataVersionHigh)
  if (result.DataVersionMid && pathResult.DataVersionMid) {
    result.DataVersionMid = result.DataVersionMid.concat(pathResult.DataVersionMid)
  }
  if (result.DataVersionLow && pathResult.DataVersionLow) {
    result.DataVersionLow = result.DataVersionLow.concat(pathResult.DataVersionLow)
  }
  return result
}

/**
 * Encodes data using a method that fits the data type.
 * @param data - The data to encode.
 * @param parseUrl - Flag wheter to optimize the resulting data for URLs.
 * @returns The encoded data for all versions.
 */
export function encode(data: string | number | number[], parseUrl: boolean): EncodedData {
  let str: string
  let buf: number[]
  const t = typeof data

  // prepare the data
  if (t === 'string' || t === 'number') {
    str = `${data}`
    buf = str.split('').map((x) => x.charCodeAt(0))
  } else if (Array.isArray(data)) {
    str = data.toString()
    buf = data.slice()
  } else {
    throw new Error('Bad data')
  }

  // select the correct method, error out if limits are exceeded
  if (/^[0-9]+$/.test(str)) {
    if (buf.length > 7089) throw new Error('Too much data')
    return encodeNumeric(str)
  }
  if (/^[0-9A-Z $%*+./:-]+$/.test(str)) {
    if (buf.length > 4296) throw new Error('Too much data')
    return encodeAlphanumeric(str)
  }
  if (parseUrl && /^https?:/i.test(str)) {
    return encodeUrl(str)
  }
  if (buf.length > 2953) {
    throw new Error('Too much data')
  }
  return encodeByte(buf)
}
