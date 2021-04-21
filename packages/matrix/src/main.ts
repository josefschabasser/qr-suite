import { encode } from './encode'
import { calculateEc } from './errorcode'
import { getMatrix } from './matrix'
import { EcLevel, QRData, EncodedData, Versions } from './datatypes'

export { EcLevel, QRData, EncodedData }

export type QRVersionList = {
  [key in keyof typeof EcLevel]?: QRData
}

/**
 * An array holding information about all possible versions. Each element acts as a template for further processing.
 * Each version consists of 4 elements corresponding to the error correction levels.
 * Each element consists of:
 * - version
 * - error correction level
 * - max length of data
 * - array of data block lengths
 * - placeholders for data
 * - length of error correction codes
 * - placeholder for error correction codes
 * */
const versionList: QRVersionList[] = Versions.map((v, index) => {
  if (!index) return {}

  const result: QRVersionList = {}
  for (let i = 1; i < 8; i += 2) {
    const length = v[0] - v[i]
    const numTemplate = v[i + 1]
    const ecLevel = EcLevel[(i / 2) | 0] as keyof typeof EcLevel
    const level: QRData = {
      version: index,
      dataLength: length,
      blocks: [], // create a 1D array to prevent empty first element
      blockLength: [],
      ec: [], // create a 1D array to prevent empty first element
      ecLength: v[i] / numTemplate,
      ecLevel,
    }
    for (let k = numTemplate, n = length; k > 0; k--) {
      const block = (n / k) | 0
      level.blockLength.push(block)
      n -= block
    }
    result[EcLevel[ecLevel]] = level
  }
  return result
})

/**
 * Creates an exact copy of the input object.
 * @param obj - The data to copy.
 * @returns An identical clone.
 */
const deepCopy = (obj: QRData): QRData => JSON.parse(JSON.stringify(obj))

/**
 * Returns a template depending on encoded data and error correction level.
 * @param message - The encoded data to consider.
 * @param ecLevel - The error correction level to use.
 * @returns A template for further processing.
 */
export function getTemplate(message: EncodedData, ecLevel: EcLevel): QRData {
  let i = 1
  let len = 0

  if (message.DataVersionLow) {
    len = Math.ceil(message.DataVersionLow.length / 8)
  } else {
    i = 10
  }
  for (; /* i */ i < 10; i++) {
    const version = versionList[i][ecLevel]
    if (version && version.dataLength >= len) {
      return deepCopy(version)
    }
  }

  if (message.DataVersionMid) {
    len = Math.ceil(message.DataVersionMid.length / 8)
  } else {
    i = 27
  }
  for (; /* i */ i < 27; i++) {
    const version = versionList[i][ecLevel]
    if (version && version.dataLength >= len) {
      return deepCopy(version)
    }
  }

  len = Math.ceil(message.DataVersionHigh.length / 8)
  for (; /* i */ i < 41; i++) {
    const version = versionList[i][ecLevel]
    if (version && version.dataLength >= len) {
      return deepCopy(version)
    }
  }
  throw new Error('Too much data')
}

/**
 * Fills supplied data into a QR code template.
 * @param message - The encoded data to fill into the template.
 * @param template - The template to fill.
 * @returns The filled template.
 */
export function fillTemplate(message: EncodedData, template: QRData): QRData {
  const blocks = new Array<number>(template.dataLength).fill(0)
  let msg: number[]
  let pad = 236
  let offset = 0

  if (template.version < 10) {
    msg = message.DataVersionLow
  } else if (template.version < 27) {
    msg = message.DataVersionMid
  } else {
    msg = message.DataVersionHigh
  }

  const len = msg.length

  for (let i = 0; i < len; i += 8) {
    let b = 0
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | (msg[i + j] ? 1 : 0)
    }
    blocks[i / 8] = b
  }

  for (let i = Math.ceil((len + 4) / 8); i < blocks.length; i++) {
    blocks[i] = pad
    pad = pad == 236 ? 17 : 236
  }

  template.blocks = template.blockLength.map((n) => {
    offset += n
    return blocks.slice(offset - n, offset)
  })
  template.ec = template.blocks.map((b) => calculateEc(b, template.ecLength))

  return template
}

/**
 * Encodes text as a QR code with a certain error correction level.
 * @param text - The text to encode in the QR code.
 * @param ecLevel - The error correction level to use.
 * @param parseUrl - (experimental) Optimize the resulting QR code for URLs. Text must begin with `https://`
 * @returns A valid QR code as a 2D array.
 */
export function matrix(
  text: string,
  ecLevel: keyof typeof EcLevel = 'M',
  parseUrl = false,
): number[][] {
  const message = encode(text, parseUrl)
  const data = fillTemplate(message, getTemplate(message, EcLevel[ecLevel]))
  const result = getMatrix(data)
  return result
}
