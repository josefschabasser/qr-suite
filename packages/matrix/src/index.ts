import { encode } from './encode'
import { calculateEc } from './errorcode'
import { getMatrix } from './matrix'
import { EcLevel, QRData, EncodedData } from './datatypes'

export { EcLevel }

export type QRVersionList = {
  [key in keyof typeof EcLevel]?: QRData
}

const versions = [
  [], // there is no version 0
  // total number of codewords, (number of ec codewords, number of blocks) * ( L, M, Q, H )
  [26, 7, 1, 10, 1, 13, 1, 17, 1],
  [44, 10, 1, 16, 1, 22, 1, 28, 1],
  [70, 15, 1, 26, 1, 36, 2, 44, 2],
  [100, 20, 1, 36, 2, 52, 2, 64, 4],
  [134, 26, 1, 48, 2, 72, 4, 88, 4], // 5
  [172, 36, 2, 64, 4, 96, 4, 112, 4],
  [196, 40, 2, 72, 4, 108, 6, 130, 5],
  [242, 48, 2, 88, 4, 132, 6, 156, 6],
  [292, 60, 2, 110, 5, 160, 8, 192, 8],
  [346, 72, 4, 130, 5, 192, 8, 224, 8], // 10
  [404, 80, 4, 150, 5, 224, 8, 264, 11],
  [466, 96, 4, 176, 8, 260, 10, 308, 11],
  [532, 104, 4, 198, 9, 288, 12, 352, 16],
  [581, 120, 4, 216, 9, 320, 16, 384, 16],
  [655, 132, 6, 240, 10, 360, 12, 432, 18], // 15
  [733, 144, 6, 280, 10, 408, 17, 480, 16],
  [815, 168, 6, 308, 11, 448, 16, 532, 19],
  [901, 180, 6, 338, 13, 504, 18, 588, 21],
  [991, 196, 7, 364, 14, 546, 21, 650, 25],
  [1085, 224, 8, 416, 16, 600, 20, 700, 25], // 20
  [1156, 224, 8, 442, 17, 644, 23, 750, 25],
  [1258, 252, 9, 476, 17, 690, 23, 816, 34],
  [1364, 270, 9, 504, 18, 750, 25, 900, 30],
  [1474, 300, 10, 560, 20, 810, 27, 960, 32],
  [1588, 312, 12, 588, 21, 870, 29, 1050, 35], // 25
  [1706, 336, 12, 644, 23, 952, 34, 1110, 37],
  [1828, 360, 12, 700, 25, 1020, 34, 1200, 40],
  [1921, 390, 13, 728, 26, 1050, 35, 1260, 42],
  [2051, 420, 14, 784, 28, 1140, 38, 1350, 45],
  [2185, 450, 15, 812, 29, 1200, 40, 1440, 48], // 30
  [2323, 480, 16, 868, 31, 1290, 43, 1530, 51],
  [2465, 510, 17, 924, 33, 1350, 45, 1620, 54],
  [2611, 540, 18, 980, 35, 1440, 48, 1710, 57],
  [2761, 570, 19, 1036, 37, 1530, 51, 1800, 60],
  [2876, 570, 19, 1064, 38, 1590, 53, 1890, 63], // 35
  [3034, 600, 20, 1120, 40, 1680, 56, 1980, 66],
  [3196, 630, 21, 1204, 43, 1770, 59, 2100, 70],
  [3362, 660, 22, 1260, 45, 1860, 62, 2220, 74],
  [3532, 720, 24, 1316, 47, 1950, 65, 2310, 77],
  [3706, 750, 25, 1372, 49, 2040, 68, 2430, 81], // 40
]

const versionList = versions.map((v, index) => {
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

  if (message.data1) {
    len = Math.ceil(message.data1.length / 8)
  } else {
    i = 10
  }
  for (; /* i */ i < 10; i++) {
    const version = versionList[i][ecLevel]
    if (version && version.dataLength >= len) {
      return deepCopy(version)
    }
  }

  if (message.data10) {
    len = Math.ceil(message.data10.length / 8)
  } else {
    i = 27
  }
  for (; /* i */ i < 27; i++) {
    const version = versionList[i][ecLevel]
    if (version && version.dataLength >= len) {
      return deepCopy(version)
    }
  }

  len = Math.ceil(message.data27.length / 8)
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
    msg = message.data1
  } else if (template.version < 27) {
    msg = message.data10
  } else {
    msg = message.data27
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
