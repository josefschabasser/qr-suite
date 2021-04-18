import { EcLevel, QRData } from './datatypes'

export function init(version: number): number[][] {
  const length = version * 4 + 17
  const matrix: number[][] = []
  let zeros: number[] = Array(length).fill(0)

  zeros = [].slice.call(zeros)

  for (let i = 0; i < length; i++) {
    matrix[i] = zeros.slice()
  }
  return matrix
}

export function fillFinders(matrix: number[][]): void {
  const length = matrix.length

  for (let i = -3; i <= 3; i++) {
    for (let j = -3; j <= 3; j++) {
      const max = Math.max(i, j)
      const min = Math.min(i, j)
      const pixel = (max === 2 && min >= -2) || (min === -2 && max <= 2) ? 0x80 : 0x81

      matrix[3 + i][3 + j] = pixel
      matrix[3 + i][length + j - 4] = pixel
      matrix[length + i - 4][3 + j] = pixel
    }
  }

  for (let i = 0; i < 8; i++) {
    matrix[7][i] = matrix[i][7] = 0x80
    matrix[7][length - 1 - i] = matrix[length - 1 - i][7] = 0x80
    matrix[length - 8][i] = matrix[i][length - 8] = 0x80
  }
}

export function fillAlignAndTiming(matrix: number[][]): void {
  const length = matrix.length

  if (length > 21) {
    const result: number[] = []
    const len = length - 13
    let delta = Math.round(len / Math.ceil(len / 28))

    if (delta % 2) delta++

    for (let p = len + 6; p > 10; p -= delta) {
      result.unshift(p)
    }
    result.unshift(6)

    for (let i = 0; i < result.length; i++) {
      for (let j = 0; j < result.length; j++) {
        const x = result[i]
        const y = result[j]

        if (matrix[x][y]) continue

        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const max = Math.max(r, c)
            const min = Math.min(r, c)
            const pixel = (max === 1 && min >= -1) || (min === -1 && max <= 1) ? 0x80 : 0x81

            matrix[x + r][y + c] = pixel
          }
        }
      }
    }
  }
  for (let i = 8; i < length - 8; i++) {
    matrix[6][i] = matrix[i][6] = i % 2 ? 0x80 : 0x81
  }
}

export function fillStub(matrix: number[][]): void {
  const length = matrix.length

  for (let i = 0; i < 8; i++) {
    if (i != 6) {
      matrix[8][i] = matrix[i][8] = 0x80
    }
    matrix[8][length - 1 - i] = matrix[length - 1 - i][8] = 0x80
  }
  matrix[8][8] = 0x80
  matrix[length - 8][8] = 0x81

  if (length < 45) return

  for (let i = length - 11; i < length - 8; i++) {
    for (let j = 0; j < 6; j++) {
      matrix[i][j] = matrix[j][i] = 0x80
    }
  }
}

export const fillReserved = (function () {
  const formats = Array(32)
  const versions = Array(40)
  const gf15 = 0x0537
  const gf18 = 0x1f25
  const formatsMask = 0x5412

  for (let format = 0; format < 32; format++) {
    let result = format << 10
    for (let i = 5; i > 0; i--) {
      if (result >>> (9 + i)) {
        result ^= gf15 << (i - 1)
      }
    }
    formats[format] = (result | (format << 10)) ^ formatsMask
  }

  for (let version = 7; version <= 40; version++) {
    let result = version << 12
    for (let i = 6; i > 0; i--) {
      if (result >>> (11 + i)) {
        result ^= gf18 << (i - 1)
      }
    }
    versions[version] = result | (version << 12)
  }

  return (matrix: number[][], ecLevel: EcLevel, mask: number) => {
    const ecLevelRemap = [() => EcLevel.M, () => EcLevel.L, () => EcLevel.H, () => EcLevel.Q]
    const ecl = ecLevelRemap[ecLevel]()
    const length = matrix.length
    const format = formats[(ecl << 3) | mask]
    const version = versions[(length - 17) / 4]

    function F(k: number) {
      return (format >> k) & 1 ? 0x81 : 0x80
    }
    function V(k: number) {
      return (version >> k) & 1 ? 0x81 : 0x80
    }

    for (let i = 0; i < 8; i++) {
      matrix[8][length - 1 - i] = F(i)
      if (i < 6) matrix[i][8] = F(i)
    }
    for (let i = 8; i < 15; i++) {
      matrix[length - 15 + i][8] = F(i)
      if (i > 8) matrix[8][14 - i] = F(i)
    }
    matrix[7][8] = F(6)
    matrix[8][8] = F(7)
    matrix[8][7] = F(8)

    if (!version) return

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        matrix[length - 11 + j][i] = matrix[i][length - 11 + j] = V(i * 3 + j)
      }
    }
  }
})()

export const fillData = (function () {
  const maskFunctions = [
    (i: number, j: number) => (i + j) % 2 == 0,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (i: number, j: number) => i % 2 == 0,
    (i: number, j: number) => j % 3 == 0,
    (i: number, j: number) => (i + j) % 3 == 0,
    (i: number, j: number) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0,
    (i: number, j: number) => ((i * j) % 2) + ((i * j) % 3) == 0,
    (i: number, j: number) => (((i * j) % 2) + ((i * j) % 3)) % 2 == 0,
    (i: number, j: number) => (((i * j) % 3) + ((i + j) % 2)) % 2 == 0,
  ]

  return (matrix: number[][], data: QRData, mask: number) => {
    const length = matrix.length
    let row: number
    let col: number
    let dir = -1
    row = col = length - 1
    const maskFunction = maskFunctions[mask]
    let len = data.blocks[data.blocks.length - 1].length

    for (let i = 0; i < len; i++) {
      for (let b = 0; b < data.blocks.length; b++) {
        if (data.blocks[b].length <= i) continue
        put(data.blocks[b][i])
      }
    }

    len = data.ecLength
    for (let i = 0; i < len; i++) {
      for (let b = 0; b < data.ec.length; b++) {
        put(data.ec[b][i])
      }
    }

    if (col > -1) {
      do {
        matrix[row][col] = maskFunction(row, col) ? 1 : 0
      } while (next())
    }

    function put(byte: number) {
      for (let m = 0x80; m; m >>= 1) {
        let pixel = !!(m & byte)
        if (maskFunction(row, col)) pixel = !pixel
        matrix[row][col] = pixel ? 1 : 0
        next()
      }
    }

    function next() {
      do {
        if (col % 2 ^ (col < 6 ? 1 : 0)) {
          if ((dir < 0 && row == 0) || (dir > 0 && row == length - 1)) {
            col--
            dir = -dir
          } else {
            col++
            row += dir
          }
        } else {
          col--
        }
        if (col == 6) {
          col--
        }
        if (col < 0) {
          return false
        }
      } while (matrix[row][col] & 0xf0)
      return true
    }
  }
})()

export function calculatePenalty(matrix: number[][]): number {
  const length = matrix.length
  let penalty = 0

  // Rule 1
  for (let i = 0; i < length; i++) {
    let pixel = matrix[i][0] & 1
    let len = 1
    for (let j = 1; j < length; j++) {
      const p = matrix[i][j] & 1
      if (p == pixel) {
        len++
        continue
      }
      if (len >= 5) {
        penalty += len - 2
      }
      pixel = p
      len = 1
    }
    if (len >= 5) {
      penalty += len - 2
    }
  }
  for (let j = 0; j < length; j++) {
    let pixel = matrix[0][j] & 1
    let len = 1
    for (let i = 1; i < length; i++) {
      const p = matrix[i][j] & 1
      if (p == pixel) {
        len++
        continue
      }
      if (len >= 5) {
        penalty += len - 2
      }
      pixel = p
      len = 1
    }
    if (len >= 5) {
      penalty += len - 2
    }
  }

  // Rule 2
  for (let i = 0; i < length - 1; i++) {
    for (let j = 0; j < length - 1; j++) {
      const s = (matrix[i][j] + matrix[i][j + 1] + matrix[i + 1][j] + matrix[i + 1][j + 1]) & 7
      if (s == 0 || s == 4) {
        penalty += 3
      }
    }
  }

  // Rule 3
  function I(i: number, j: number, k: number) {
    return matrix[i][j + k] & 1
  }
  function J(i: number, j: number, k: number) {
    return matrix[i + k][j] & 1
  }
  for (let i = 0; i < length; i++) {
    for (let j = 0; j < length; j++) {
      if (
        j < length - 6 &&
        I(i, j, 0) &&
        !I(i, j, 1) &&
        I(i, j, 2) &&
        I(i, j, 3) &&
        I(i, j, 4) &&
        !I(i, j, 5) &&
        I(i, j, 6)
      ) {
        if (j >= 4 && !(I(i, j, -4) || I(i, j, -3) || I(i, j, -2) || I(i, j, -1))) {
          penalty += 40
        }
        if (j < length - 10 && !(I(i, j, 7) || I(i, j, 8) || I(i, j, 9) || I(i, j, 10))) {
          penalty += 40
        }
      }

      if (
        i < length - 6 &&
        J(i, j, 0) &&
        !J(i, j, 1) &&
        J(i, j, 2) &&
        J(i, j, 3) &&
        J(i, j, 4) &&
        !J(i, j, 5) &&
        J(i, j, 6)
      ) {
        if (i >= 4 && !(J(i, j, -4) || J(i, j, -3) || J(i, j, -2) || J(i, j, -1))) {
          penalty += 40
        }
        if (i < length - 10 && !(J(i, j, 7) || J(i, j, 8) || J(i, j, 9) || J(i, j, 10))) {
          penalty += 40
        }
      }
    }
  }

  // Rule 4
  let numDark = 0
  for (let i = 0; i < length; i++) {
    for (let j = 0; j < length; j++) {
      if (matrix[i][j] & 1) numDark++
    }
  }
  penalty += 10 * Math.floor(Math.abs(10 - (20 * numDark) / (length * length)))

  return penalty
}

export function getMatrix(data: QRData): number[][] {
  const matrix = init(data.version)
  fillFinders(matrix)
  fillAlignAndTiming(matrix)
  fillStub(matrix)

  let penalty = Infinity
  let bestMask = 0
  for (let mask = 0; mask < 8; mask++) {
    fillData(matrix, data, mask)
    fillReserved(matrix, data.ecLevel, mask)
    const p = calculatePenalty(matrix)
    if (p < penalty) {
      penalty = p
      bestMask = mask
    }
  }

  fillData(matrix, data, bestMask)
  fillReserved(matrix, data.ecLevel, bestMask)

  return matrix.map((row) => row.map((cell) => cell & 1))
}
