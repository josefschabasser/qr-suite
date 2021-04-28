import { matrix, EcLevel } from '@qr-suite/matrix'
import { EOL } from 'os'

export interface Options {
  ecLevel: keyof typeof EcLevel
  parseUrl: boolean
  size: 'small' | 'medium' | 'large'
  border: boolean
}

function createSmallAndMedium(m: number[][], s = false): string[] {
  const msg: string[] = []
  const moduleCount = m.length
  const moduleData = m.slice()
  const oddRow = moduleCount % 2 === 1
  const stepY = 2
  let modulePattern: string[]
  let stepX: number
  if (s) {
    stepX = 2
    modulePattern = [
      '\u2588', // 00 \n 00
      '\u259B', // 00 \n 01
      '\u259C', // 00 \n 10
      '\u2580', // 00 \n 11
      '\u2599', // 01 \n 00
      '\u258C', // 01 \n 01
      '\u259A', // 01 \n 10
      '\u2598', // 01 \n 11
      '\u259F', // 10 \n 00
      '\u259E', // 10 \n 01
      '\u2590', // 10 \n 10
      '\u259D', // 10 \n 11
      '\u2584', // 11 \n 00
      '\u2596', // 11 \n 01
      '\u2597', // 11 \n 10
      ' ', //      11 \n 11
    ]
  } else {
    stepX = 1
    modulePattern = [
      '\u2588', // 0 \n 0
      '\u2580', // 0 \n 1
      '\u2584', // 1 \n 0
      ' ', //      1 \n 1
    ]
  }
  if (oddRow) moduleData.push(new Array(moduleCount).fill(0))

  for (let y = 0; y < moduleCount; y += stepY) {
    let line = ''
    for (let x = 0; x < moduleCount; x += stepX) {
      let pat = 0
      if (s) {
        pat |= moduleData[y][x] << 3
        pat |= moduleData[y][x + 1] << 2
        pat |= moduleData[y + 1][x] << 1
        pat |= moduleData[y + 1][x + 1] << 0
      } else {
        pat |= moduleData[y][x] << 1
        pat |= moduleData[y + 1][x] << 0
      }
      line += modulePattern[pat]
    }
    msg.push(line)
  }

  return msg
}

function createLarge(m: number[][]): string[] {
  const msg: string[] = []
  const modulePattern = [
    '\u2588\u2588', // 0
    '  ', //           1
  ]

  m.forEach((row: number[]) => {
    let line = ''
    row.forEach((module: number) => {
      line += modulePattern[module]
    })
    msg.push(line)
  })

  return msg
}

export function terminal(text: string, options?: Partial<Options>): string {
  const opts = Object.assign(
    {
      ecLevel: 'M',
      parseUrl: false,
      size: 'medium',
      border: true,
    },
    options,
  )

  const m = matrix(text, opts.ecLevel, opts.parseUrl)
  let msg: string[]

  if (opts.border) {
    m.forEach((x) => {
      x.unshift(0)
      x.push(0)
    })
    const l = m[0].length
    m.unshift(new Array<number>(l).fill(0))
    m.push(new Array<number>(l).fill(0))
  }

  switch (opts.size) {
    case 'small':
      msg = createSmallAndMedium(m, true)
      break
    case 'large':
      msg = createLarge(m)
      break
    case 'medium':
    default:
      msg = createSmallAndMedium(m, false)
      break
  }

  return msg.join(EOL)
}
