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

  const moduleData = matrix(text, opts.ecLevel, opts.parseUrl)
  if (opts.border) {
    moduleData.forEach((x) => {
      x.unshift(0)
      x.push(0)
    })
    const l = moduleData[0].length
    moduleData.unshift(new Array<number>(l).fill(0))
    moduleData.push(new Array<number>(l).fill(0))
  }

  const message: string[] = []
  const moduleCount = moduleData.length
  let pattern: string[]
  let stepX: number, stepY: number

  switch (opts.size) {
    case 'S':
      stepX = stepY = 2
      pattern = [
        '\u2588',
        '\u259B',
        '\u259C',
        '\u2580',
        '\u2599',
        '\u258C',
        '\u259A',
        '\u2598',
        '\u259F',
        '\u259E',
        '\u2590',
        '\u259D',
        '\u2584',
        '\u2596',
        '\u2597',
        ' ',
      ]
      break
    case 'L':
      stepX = stepY = 1
      pattern = ['\u2588\u2588', '  ']
      break
    case 'M':
    default:
      stepX = 1
      stepY = 2
      pattern = ['\u2588', '\u2580', '\u2584', ' ']
      break
  }

  if (opts.size !== 'L' && moduleCount % 2 === 1) {
    moduleData.push(new Array(moduleCount).fill(0))
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
      line += pattern[pat]
    }
    message.push(line)
  }

  return message.join(EOL)
}
