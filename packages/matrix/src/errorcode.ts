/**
 * Error correction is based on Reed-Solomon codes and Galois Fields (finite fields): GF(256)
 * We can't use the Math lib here, so we are generating log/exp/polynomial tables.
 *
 * Please forgive me if something is wrong, I have always been bad at math.
 */

const gf256Base = 285
const expTable = [1]
const logTable: number[] = []
const polynomials = [
  [0], // a^0 x^0
  [0, 0], // a^0 x^1 + a^0 x^0
  [0, 25, 1], // a^0 x^2 + a^25 x^1 + a^1 x^0
  // and so on...
]

// generate exp table
for (let i = 1; i < 256; i++) {
  let n = expTable[i - 1] << 1
  if (n > 255) n ^= gf256Base
  expTable[i] = n
}

// generate log table
for (let i = 0; i < 255; i++) {
  logTable[expTable[i]] = i
}

/**
 * Calculates the exponent of an input number.
 * @param k - The exponent base.
 * @returns The exponent of `k`.
 */
function exp(k: number): number {
  let r = k
  while (r < 0) r += 255
  while (r > 255) r -= 255
  return expTable[r]
}

/**
 * Calculates the logarithm of an input number.
 * @param k - The logarithm base.
 * @returns The logarithm of `k`.
 */
function log(k: number): number {
  if (k < 1 || k > 255) {
    throw Error(`Bad log(${k})`)
  }
  return logTable[k]
}

/**
 * Generates and stores the polynomial of an input number.
 * @param num - The polynomial degree.
 * @returns The resulting polynomial.
 */
function generatorPolynomial(num: number): number[] {
  if (polynomials[num]) {
    return polynomials[num]
  }

  const prev = generatorPolynomial(num - 1)
  const res = []

  res[0] = prev[0]
  for (let i = 1; i <= num; i++) {
    res[i] = log(exp(prev[i]) ^ exp(prev[i - 1] + num - 1))
  }
  polynomials[num] = res
  return res
}

/**
 * Calculates the Reed-Solomon error correction code.
 * @param message - The message to evaluate.
 * @param ecLength - The length of the resulting code.
 * @returns The error correction code for supplied message with specified length.
 */
export function calculateEc(message: number[], ecLength: number): number[] {
  const arr = message.slice()
  const poly = generatorPolynomial(ecLength)

  for (let i = 0; i < ecLength; i++) arr.push(0)
  while (arr.length > ecLength) {
    if (!arr[0]) {
      arr.shift()
      continue
    }
    const log0 = log(arr[0])
    for (let i = 0; i <= ecLength; i++) {
      arr[i] = arr[i] ^ exp(poly[i] + log0)
    }
    arr.shift()
  }
  return arr
}
