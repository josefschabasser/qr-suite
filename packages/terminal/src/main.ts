import { matrix, EcLevel } from '@qr-suite/matrix'
import { EOL } from 'os'

/** Options to customize the generated QR code. */
export interface Options {
  /** The error correction level to use. */
  ecLevel: keyof typeof EcLevel
  /** Try to optimize the QR code for URLs, experimental. */
  parseUrl: boolean
  /** The size of the resulting QR code, `S` is distorted but saves characters. */
  size: 'S' | 'M' | 'L'
  /** Add borders (quiet zone) around the QR code. */
  border: boolean
}

/**
 * Generates QR codes suitable for terminals.
 * @param text - The text to encode.
 * @param options - Options to customize the outcome.
 * @returns An array of strings containing the QR code (line by line).
 */
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

  // generate a QR code matrix and add borders
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

  // prepare unicode characters and step sizes
  // see unicode characters: https://www.compart.com/unicode/block/U+2580
  switch (opts.size) {
    case 'S':
      stepX = stepY = 2
      pattern = [
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
      pattern = ['\u2588\u2588', '  ']
      break
    case 'M':
    default:
      stepX = 1
      stepY = 2
      pattern = ['\u2588', '\u2580', '\u2584', ' ']
      break
  }

  // add empty row if S|M and odd number of rows
  if (opts.size !== 'L' && moduleCount % 2 === 1) {
    moduleData.push(new Array(moduleCount).fill(0))
  }

  for (let y = 0; y < moduleCount; y += stepY) {
    let line = ''
    for (let x = 0; x < moduleCount; x += stepX) {
      // build pattern index to directly access patterns from above
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
