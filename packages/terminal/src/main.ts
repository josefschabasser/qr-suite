import { matrix, EcLevel } from '@qr-suite/matrix'
import { EOL } from 'os'

export interface Options {
  ecLevel: keyof typeof EcLevel
  parseUrl: boolean
  size: 'S' | 'M' | 'L'
  border: boolean
}

export function terminal(text: string, options?: Partial<Options>): string {
  const opts = Object.assign(
    {
      ecLevel: 'M',
      parseUrl: false,
      size: 'M',
      border: true,
    },
    options,
  )

  const m = matrix(text, opts.ecLevel, opts.parseUrl)
  if (opts.border) {
    m.forEach((x) => {
      x.unshift(0)
      x.push(0)
    })
    const l = m[0].length
    m.unshift(new Array<number>(l).fill(0))
    m.push(new Array<number>(l).fill(0))
  }

  const msg: string[] = []
  const moduleCount = m.length
  const moduleData = m.slice()
  const oddRow = moduleCount % 2 === 1
  let modulePattern: string[]
  let stepX: number, stepY: number
  switch (opts.size) {
    case 'S':
      stepX = stepY = 2
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
      break
    case 'L':
      stepX = stepY = 1
      modulePattern = [
        '\u2588\u2588', // 0
        '  ', //           1
      ]
      break
    case 'M':
    default:
      stepX = 1
      stepY = 2
      modulePattern = [
        '\u2588', // 0 \n 0
        '\u2580', // 0 \n 1
        '\u2584', // 1 \n 0
        ' ', //      1 \n 1
      ]
      break
  }

  if (opts.size !== 'L') {
    if (oddRow) moduleData.push(new Array(moduleCount).fill(0))
  }

  for (let y = 0; y < moduleCount; y += stepY) {
    let line = ''
    for (let x = 0; x < moduleCount; x += stepX) {
      let pat = 0
      switch (opts.size) {
        case 'S':
          pat |= moduleData[y][x] << 3
          pat |= moduleData[y][x + 1] << 2
          pat |= moduleData[y + 1][x] << 1
          pat |= moduleData[y + 1][x + 1]
          break
        case 'L':
          pat = moduleData[y][x]
          break
        case 'M':
        default:
          pat |= moduleData[y][x] << 1
          pat |= moduleData[y + 1][x]
          break
      }
      line += modulePattern[pat]
    }
    msg.push(line)
  }

  return msg.join(EOL)
}
