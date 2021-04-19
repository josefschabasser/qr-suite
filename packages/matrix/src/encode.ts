import { EncodedData, Encoding } from './datatypes'

function pushBits(arr: number[], size: number, value: number): void {
  for (let bit = 1 << (size - 1); bit; bit >>>= 1) {
    arr.push(bit & value ? 1 : 0)
  }
}

function getData(encoding: number[], length: number, size: number, bits: number[]): number[] {
  const d = encoding.slice()
  pushBits(d, size, length)
  return d.concat(bits)
}

function encode8Bit(data: Buffer): EncodedData {
  const encoding = Encoding.Byte
  const length = data.length
  const bits: number[] = []
  const result = (): EncodedData => ({ data1: [], data10: [], data27: [] })

  for (let i = 0; i < length; i++) {
    pushBits(bits, 8, data[i])
  }

  result.data10 = result.data27 = getData(encoding, length, 16, bits)
  if (length < 256) {
    result.data1 = getData(encoding, length, 8, bits)
  }
  return result
}

function encodeAlphanumeric(data: string): EncodedData {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'
  const encoding = Encoding.Alphanumeric
  const length = data.length
  const bits: number[] = []
  const result = (): EncodedData => ({ data1: [], data10: [], data27: [] })

  for (let i = 0; i < length; i += 2) {
    let size = 6
    let value = charset.indexOf(data[i])

    if (data[i + 1]) {
      size = 11
      value = 45 * value + charset.indexOf(data[i + 1])
    }
    pushBits(bits, size, value)
  }

  result.data27 = getData(encoding, length, 13, bits)
  if (length < 2048) {
    result.data10 = getData(encoding, length, 11, bits)
  }
  if (length < 512) {
    result.data1 = getData(encoding, length, 9, bits)
  }
  return result
}

function encodeNumeric(data: string): EncodedData {
  const encoding = Encoding.Numeric
  const length = data.length
  const bits: number[] = []
  const result = (): EncodedData => ({ data1: [], data10: [], data27: [] })

  result.data27 = getData(encoding, length, 14, bits)
  if (length < 4096) {
    result.data10 = getData(encoding, length, 12, bits)
  }
  if (length < 1024) {
    result.data1 = getData(encoding, length, 10, bits)
  }
  return result
}

function encodeUrl(data: string): EncodedData {
  const slash = data.indexOf('/', 8) + 1 || data.length
  const result = encode(data.slice(0, slash).toUpperCase(), false)

  if (slash >= data.length) {
    return result
  }

  const pathResult = encode(data.slice(slash), false)

  result.data27 = result.data27.concat(pathResult.data27)
  if (result.data10 && pathResult.data10) {
    result.data10 = result.data10.concat(pathResult.data10)
  }
  if (result.data1 && pathResult.data1) {
    result.data1 = result.data1.concat(pathResult.data1)
  }
  return result
}

export function encode(data: string | number | Buffer | number[], parseUrl: boolean): EncodedData {
  let str: string
  let buf: Buffer
  const t = typeof data

  if (t === 'string' || t === 'number') {
    str = `${data}`
    buf = Buffer.from(str)
  } else if (Buffer.isBuffer(data)) {
    str = data.toString()
    buf = data
  } else if (Array.isArray(data)) {
    str = data.toString()
    buf = Buffer.from(data)
  } else {
    throw new Error('Bad data')
  }

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
  return encode8Bit(buf)
}
