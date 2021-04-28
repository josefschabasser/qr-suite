#!/usr/bin/env node

import { terminal } from '@qr-suite/terminal'
import chalk from 'chalk'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import path from 'path'
import fs from 'fs'

type EcLevel = 'L' | 'M' | 'Q' | 'H'
const ecLevels: ReadonlyArray<EcLevel> = ['L', 'M', 'Q', 'H']
type Size = 'S' | 'M' | 'L'
const sizes: ReadonlyArray<Size> = ['S', 'M', 'L']

// OMFG - all this just to replace the script name with the bin name from package.json
const packagePath = path.join(__dirname, '..', 'package.json')
const packageJson = fs.readFileSync(packagePath, 'utf8')
const binaries = JSON.parse(packageJson).bin
const file = `${path.basename(__dirname)}/${path.basename(__filename)}`
const scriptName = Object.keys(binaries).find((key) => binaries[key] === file) || 'qrsuite-terminal'

// Get text from pipe
if (!process.stdin.isTTY) {
  const bufSize = 65536
  const buffer = Buffer.alloc(bufSize)
  const readSize = fs.readSync(0, buffer, 0, bufSize, null)
  process.argv.push(buffer.slice(0, readSize).toString().trim())
}

// now parse args
const argv = yargs(hideBin(process.argv))
  .scriptName(scriptName)
  .command(
    '$0 <text..>',
    'Encodes <text> in a QR code, can be customized by adding options.',
    (y) => {
      y.positional('text', {
        describe: 'text to encode',
        type: 'string',
      }).example('$0 "I <3 Github"', '// creates a QR code with "I <3 Github"')
    },
  )
  .options({
    e: { choices: ecLevels, default: 'M' },
    u: { type: 'boolean', default: false },
    b: { type: 'boolean', default: true },
    s: { choices: sizes, default: 'M' },
    f: { type: 'string', default: 'black' },
    g: { type: 'string', default: 'white' },
  })
  .alias('e', 'ec-level')
  .nargs('e', 1)
  .describe('e', 'Error correction level.')
  .alias('u', 'url')
  .describe('u', 'Optimize QR code for URLs, experimental.')
  .alias('b', 'border')
  .describe('b', 'Adds borders around the QR code.')
  .alias('s', 'size')
  .nargs('s', 1)
  .describe('s', 'The size of the resulting QR code.')
  .alias('f', 'foreground')
  .nargs('f', 1)
  .describe('f', 'Foreground color, must be a valid CSS color code or keyword.')
  .alias('g', 'background')
  .nargs('g', 1)
  .describe('g', 'Background color, must be a valid CSS color code or keyword.')
  .help('h')
  .alias('h', 'help')
  .epilog('Created with <3 for the community!').argv

// error out if colors are the same
if (argv.background === argv.foreground) {
  throw new Error('Foreground and background color must be different')
}

// we have to invert colors because lib is optimized for black background and white fonts
const colorize = chalk.keyword(argv.background).bgKeyword(argv.foreground)

// create QR code
const msg = terminal((<string[]>argv.text).join(' '), {
  parseUrl: argv.url,
  border: argv.border,
  ecLevel: <EcLevel>argv['ec-level'],
  size: <Size>argv.size,
})

// print to console
console.log(colorize(msg))
