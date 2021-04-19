import { encode } from './encode'
import { calculateEc } from './errorcode'
import { getMatrix } from './matrix'
import { EcLevel, QRData, EncodedData, Versions } from './datatypes'

export { EcLevel }

export type QRVersionList = {
  [key in keyof typeof EcLevel]?: QRData
}

const versionList = Versions.map((v, index) => {
  if (!index) return {}

  const result: QRVersionList = {}
  for (let i = 1; i < 8; i += 2) {
    const length = v[0] - v[i]
    const numTemplate = v[i + 1]
    const ecLevel = EcLevel[EcLevel[(i / 2) | 0] as keyof typeof EcLevel]
    const level: QRData = {
      version: index,
      ecLevel,
      dataLength: length,
      ecLength: v[i] / numTemplate,
      blocks: [[]],
      ec: [[]],
    }
    for (let k = numTemplate, n = length; k > 0; k--) {
      const block = (n / k) | 0
      level.blocks[0].push(block)
      n -= block
    }
    result[ecLevel] = level
  }
  return result
})

function deepCopy(obj: QRData): QRData {
  return JSON.parse(JSON.stringify(obj))
}

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

export function fillTemplate(message: EncodedData, template: QRData): QRData {
  const blocks = Buffer.alloc(template.dataLength).fill(0)
  let msg: number[]

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

  let pad = 236
  for (let i = Math.ceil((len + 4) / 8); i < blocks.length; i++) {
    blocks[i] = pad
    pad = pad == 236 ? 17 : 236
  }

  let offset = 0
  template.blocks = Array.prototype.slice.call(
    template.blocks[0].map((n) => {
      const b = blocks.slice(offset, offset + n)
      offset += n
      template.ec[0] = calculateEc(b, template.ecLength)
      return b
    }),
  )

  return template
}

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
