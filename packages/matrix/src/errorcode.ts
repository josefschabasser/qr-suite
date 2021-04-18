const gf256Base = 285

const expTable = [1]
const logTable: number[] = []

for (let i = 1; i < 256; i++) {
  let n = expTable[i - 1] << 1
  if (n > 255) n ^= gf256Base
  expTable[i] = n
}

for (let i = 0; i < 255; i++) {
  logTable[expTable[i]] = i
}

function exp(k: number) {
  let r = k
  while (r < 0) r += 255
  while (r > 255) r -= 255
  return expTable[r]
}

function log(k: number) {
  if (k < 1 || k > 255) {
    throw Error(`Bad log(${k})`)
  }
  return logTable[k]
}

const polynomials = [
  [0], // a^0 x^0
  [0, 0], // a^0 x^1 + a^0 x^0
  [0, 25, 1], // a^0 x^2 + a^25 x^1 + a^1 x^0
  // and so on...
]

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

export function calculateEc(msg: number[] | Buffer, ecLength: number): Buffer {
  const arr: number[] = [].slice.call(msg)

  const poly = generatorPolynomial(ecLength)

  for (let i = 0; i < ecLength; i++) arr.push(0)
  while (arr.length > ecLength) {
    if (!arr[0]) {
      arr.shift()
      continue
    }
    const logK = log(arr[0])
    for (let i = 0; i <= ecLength; i++) {
      arr[i] = arr[i] ^ exp(poly[i] + logK)
    }
    arr.shift()
  }
  return Buffer.from(arr)
}
