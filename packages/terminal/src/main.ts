import { matrix, EcLevel } from '@qr-suite/matrix'
import { EOL } from 'os'
import chalk from 'chalk'

export interface Options {
  ecLevel: keyof typeof EcLevel
  parseUrl: boolean
  width: number
  fgColor: string
  bgColor: string
  small: boolean
  border: boolean
}

function createLine(rect: string, length: number) {
  return Array(length + 2)
    .fill(rect)
    .join('')
}

export function terminal(text: string, options: Partial<Options>): void {
  const opts = Object.assign(
    {
      ecLevel: 'M',
      parseUrl: false,
      fgColor: 'black',
      bgColor: 'white',
      small: false,
      border: true,
    },
    options,
  )

  const colorize = chalk.keyword(opts.fgColor).bgKeyword(opts.bgColor)
  const m = matrix(text, opts.ecLevel, opts.parseUrl)
  const msg: string[] = []

  if (opts.small) {
    const moduleCount = m.length,
      moduleData = m.slice()
    const oddRow = m.length % 2 === 1
    const moduleFull = '\u2588',
      moduleHalfFull = '\u2580',
      moduleHalfEmpty = '\u2584',
      moduleEmpty = ' '

    if (oddRow) moduleData.push(Array(moduleCount).fill(0))

    if (opts.border) msg.push(createLine(moduleHalfFull, m.length))
    for (let y = 0; y < moduleCount; y += 2) {
      const line: string[] = []
      if (opts.border) line.push(moduleEmpty)
      for (let x = 0; x < moduleCount; x++) {
        if (moduleData[y][x] && moduleData[y + 1][x]) line.push(moduleFull)
        else if (moduleData[y][x] && !moduleData[y + 1][x]) line.push(moduleHalfFull)
        else if (!moduleData[y][x] && moduleData[y + 1][x]) line.push(moduleHalfEmpty)
        else line.push(moduleEmpty)
      }
      if (opts.border) line.push(moduleEmpty)
      msg.push(line.join(''))
    }
    if (!oddRow && opts.border) msg.push(createLine(moduleHalfEmpty, m.length))
  } else {
    const moduleFull = '\u2588\u2588',
      moduleEmpty = '  '

    if (opts.border) msg.push(createLine(moduleEmpty, m.length))
    m.forEach((row: number[]) => {
      const line: string[] = []
      if (opts.border) line.push(moduleEmpty)
      row.forEach((module: number) => {
        if (module) line.push(moduleFull)
        else line.push(moduleEmpty)
      })
      if (opts.border) line.push(moduleEmpty)
      msg.push(line.join(''))
    })
    if (opts.border) msg.push(createLine(moduleEmpty, m.length))
  }

  console.log(colorize(msg.join(EOL)))
}
