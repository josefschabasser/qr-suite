import { EcLevel, QRData } from './datatypes'

const light = 0x80
const dark = 0x81

/**
 * Initilizes a matrix for given version.
 * @param version - The version to determine dimensions.
 * @returns A new matrix filled with zeros.
 */
export function init(version: number): number[][] {
  const length = version * 4 + 17
  const matrix: number[][] = []

  for (let i = 0; i < length; i++) {
    matrix.push(new Array<number>(length).fill(0))
  }
  return matrix
}

/**
 * Fills finders into a matrix. Finders are the big squares in the upper left and right and lower left corners.
 * @param matrix - The matrix to work on.
 */
export function fillFinders(matrix: number[][]): void {
  const length = matrix.length

  // finders
  for (let i = -3; i <= 3; i++) {
    for (let j = -3; j <= 3; j++) {
      const max = Math.max(i, j)
      const min = Math.min(i, j)
      const pixel = (max === 2 && min >= -2) || (min === -2 && max <= 2) ? light : dark

      matrix[3 + i][3 + j] = pixel // upper left
      matrix[3 + i][length + j - 4] = pixel // upper right
      matrix[length + i - 4][3 + j] = pixel // lower left
    }
  }

  // separators (white space around finders)
  for (let i = 0; i < 8; i++) {
    matrix[7][i] = matrix[i][7] = light // upper left
    matrix[7][length - i - 1] = matrix[i][length - 8] = light // upper right
    matrix[length - 8][i] = matrix[length - i - 1][7] = light // lower left
  }
}

/**
 * Fills alignment and timing into a matrix. Alignments are like finders but smaller,
 * and timing are lines (alternating dark/light) connecting the finders.
 * @param matrix - The matrix to work on.
 */
export function fillAlignAndTiming(matrix: number[][]): void {
  const length = matrix.length

  // alignment
  if (length > 21) {
    const result: number[] = []
    const len = length - 13
    let delta = Math.round(len / Math.ceil(len / 28))

    if (delta % 2) delta++

    for (let p = len + 6; p > 10; p -= delta) {
      result.push(p)
    }
    result.push(6)

    for (let i = 0; i < result.length; i++) {
      for (let j = 0; j < result.length; j++) {
        const x = result[i]
        const y = result[j]

        if (matrix[x][y]) continue

        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const max = Math.max(r, c)
            const min = Math.min(r, c)
            const pixel = (max === 1 && min >= -1) || (min === -1 && max <= 1) ? light : dark

            matrix[x + r][y + c] = pixel
          }
        }
      }
    }
  }

  // timing
  for (let i = 8; i < length - 8; i++) {
    matrix[6][i] = matrix[i][6] = i % 2 ? light : dark
  }
}

/**
 * Fills format and version areas with zeros.
 * @param matrix - The matrix to work on.
 */
export function fillStub(matrix: number[][]): void {
  const length = matrix.length

  // format areas
  for (let i = 0; i < 8; i++) {
    if (i != 6) {
      matrix[8][i] = matrix[i][8] = light
    }
    matrix[8][length - 1 - i] = matrix[length - 1 - i][8] = light
  }
  matrix[8][8] = light
  matrix[length - 8][8] = dark

  if (length < 45) return

  // version areas
  for (let i = length - 11; i < length - 8; i++) {
    for (let j = 0; j < 6; j++) {
      matrix[i][j] = matrix[j][i] = light
    }
  }
}

/**
 * Fills format and version areas with correct information.
 * @param matrix - The matrix to work on.
 * @param ecLevel - The error correction level to use.
 * @param mask - The bit mask to use.
 */
export const fillFormatAndVersion = (() => {
  const formats = new Array<number>(32)
  const versions = new Array<number>(40)
  const gf15 = 0x0537
  const gf18 = 0x1f25
  const formatsMask = 0x5412

  // prepare formats
  for (let f = 0; f < 32; f++) {
    let result = f << 10
    for (let i = 5; i > 0; i--) {
      if (result >>> (9 + i)) {
        result ^= gf15 << (i - 1)
      }
    }
    formats[f] = (result | (f << 10)) ^ formatsMask
  }

  // prepare versions
  for (let v = 7; v <= 40; v++) {
    let result = v << 12
    for (let i = 6; i > 0; i--) {
      if (result >>> (11 + i)) {
        result ^= gf18 << (i - 1)
      }
    }
    versions[v] = result | (v << 12)
  }

  return (matrix: number[][], ecLevel: keyof typeof EcLevel, mask: number) => {
    // remaps L=>1, M=>0, Q=>3, L=>2
    const ecLevelRemap = [1, 0, 3, 2]
    const ecl = ecLevelRemap[EcLevel[ecLevel]]
    const length = matrix.length
    const format = formats[(ecl << 3) | mask]
    const version = versions[(length - 17) / 4]

    const F = (k: number): number => ((format >> k) & 1 ? dark : light)
    const V = (k: number): number => ((version >> k) & 1 ? dark : light)

    // format
    for (let i = 0; i < 8; i++) {
      matrix[8][length - 1 - i] = F(i) // upper right
      if (i < 6) matrix[i][8] = F(i) // upper left vertical
    }
    for (let i = 8; i < 15; i++) {
      matrix[length - 15 + i][8] = F(i) // lower left
      if (i > 8) matrix[8][14 - i] = F(i) // upper left horizontal
    }
    // upper left corner (connecting horizontal and vertical)
    matrix[7][8] = F(6)
    matrix[8][8] = F(7)
    matrix[8][7] = F(8)

    if (!version) return

    // version
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        // lower left              = upper right
        matrix[length - 11 + j][i] = matrix[i][length - 11 + j] = V(i * 3 + j)
      }
    }
  }
})()

/**
 * Fills data into the matrix.
 * @param matrix - The matrix to fill.
 * @param data - The data to fill in.
 * @param mask - The bit mask to use.
 */
export const fillData = (() => {
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
    let row = length - 1
    let col = row
    let dir = -1
    const maskFunction = maskFunctions[mask]
    let len = data.blocks[data.blocks.length - 1].length

    function put(byte: number): void {
      for (let m = light; m; m >>= 1) {
        let pixel = !!(m & byte)
        if (maskFunction(row, col)) pixel = !pixel
        matrix[row][col] = pixel ? 1 : 0
        next()
      }
    }

    function next(): boolean {
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
  }
})()

/**
 * Calculates the penalty from a given matrix.
 * @param matrix - The matrix to analyze.
 * @returns The penalty of the matrix.
 */
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
  const I = (i: number, j: number, k: number): number => matrix[i][j + k] & 1
  const J = (i: number, j: number, k: number): number => matrix[i + k][j] & 1
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

/**
 * Creates a matrix containing everything needed for a valid QR code.
 * @param data - The encoded data to fill into the matrix.
 * @returns A matrix with data, finders, alignment, timing, version and format information.
 */
export function getMatrix(data: QRData): number[][] {
  const matrix = init(data.version)
  let penalty = Infinity
  let bestMask = 0

  fillFinders(matrix)
  fillAlignAndTiming(matrix)
  fillStub(matrix)

  for (let mask = 0; mask < 8; mask++) {
    fillData(matrix, data, mask)
    fillFormatAndVersion(matrix, data.ecLevel, mask)
    const p = calculatePenalty(matrix)
    if (p < penalty) {
      penalty = p
      bestMask = mask
    }
  }

  fillData(matrix, data, bestMask)
  fillFormatAndVersion(matrix, data.ecLevel, bestMask)
  return matrix.map((row) => row.map((cell) => cell & 1))
}
