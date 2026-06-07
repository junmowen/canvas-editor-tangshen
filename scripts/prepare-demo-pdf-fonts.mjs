import fs from 'fs'
import path from 'path'
import { Buffer } from 'buffer'

function readU16(buffer, offset) {
  return buffer.readUInt16BE(offset)
}

function readU32(buffer, offset) {
  return buffer.readUInt32BE(offset)
}

function writeU16(buffer, offset, value) {
  buffer.writeUInt16BE(value, offset)
}

function writeU32(buffer, offset, value) {
  buffer.writeUInt32BE(value >>> 0, offset)
}

function pad4(value) {
  return (value + 3) & ~3
}

function tableChecksum(buffer, start, length) {
  let sum = 0
  const paddedLength = pad4(length)
  for (let index = 0; index < paddedLength; index += 4) {
    let value = 0
    for (let byteIndex = 0; byteIndex < 4; byteIndex++) {
      const sourceIndex = start + index + byteIndex
      value =
        (value << 8) + (sourceIndex < start + length ? buffer[sourceIndex] : 0)
    }
    sum = (sum + value) >>> 0
  }
  return sum >>> 0
}

function fontChecksum(buffer) {
  let sum = 0
  const paddedLength = pad4(buffer.length)
  for (let index = 0; index < paddedLength; index += 4) {
    let value = 0
    for (let byteIndex = 0; byteIndex < 4; byteIndex++) {
      const sourceIndex = index + byteIndex
      value = (value << 8) + (sourceIndex < buffer.length ? buffer[sourceIndex] : 0)
    }
    sum = (sum + value) >>> 0
  }
  return sum >>> 0
}

function extractTtcFace(inputPath, outputPath, faceIndex = 0) {
  const source = fs.readFileSync(inputPath)
  if (source.subarray(0, 4).toString('ascii') !== 'ttcf') {
    throw new Error(`${inputPath} is not a TTC font`)
  }
  const numFonts = readU32(source, 8)
  if (faceIndex >= numFonts) {
    throw new Error(`${inputPath} does not contain face ${faceIndex}`)
  }
  const faceOffset = readU32(source, 12 + faceIndex * 4)
  const sfntVersion = readU32(source, faceOffset)
  const numTables = readU16(source, faceOffset + 4)
  const searchRange = readU16(source, faceOffset + 6)
  const entrySelector = readU16(source, faceOffset + 8)
  const rangeShift = readU16(source, faceOffset + 10)
  const tableList = []
  for (let index = 0; index < numTables; index++) {
    const recordOffset = faceOffset + 12 + index * 16
    tableList.push({
      tag: source.subarray(recordOffset, recordOffset + 4).toString('ascii'),
      offset: readU32(source, recordOffset + 8),
      length: readU32(source, recordOffset + 12)
    })
  }
  let nextOffset = 12 + numTables * 16
  const outputTableList = tableList.map(table => {
    const outputTable = {
      ...table,
      newOffset: nextOffset
    }
    nextOffset += pad4(table.length)
    return outputTable
  })
  const output = Buffer.alloc(nextOffset)
  writeU32(output, 0, sfntVersion)
  writeU16(output, 4, numTables)
  writeU16(output, 6, searchRange)
  writeU16(output, 8, entrySelector)
  writeU16(output, 10, rangeShift)
  outputTableList.forEach((table, index) => {
    const recordOffset = 12 + index * 16
    output.write(table.tag, recordOffset, 4, 'ascii')
    writeU32(output, recordOffset + 4, tableChecksum(source, table.offset, table.length))
    writeU32(output, recordOffset + 8, table.newOffset)
    writeU32(output, recordOffset + 12, table.length)
    source.copy(output, table.newOffset, table.offset, table.offset + table.length)
  })
  const headTable = outputTableList.find(table => table.tag === 'head')
  if (headTable) {
    writeU32(output, headTable.newOffset + 8, 0)
    writeU32(output, headTable.newOffset + 8, (0xB1B0AFBA - fontChecksum(output)) >>> 0)
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, output)
}

const fontsDir = path.resolve('public/fonts')
extractTtcFace(
  'C:/Windows/Fonts/msyh.ttc',
  path.join(fontsDir, 'MicrosoftYaHei-Regular.ttf')
)
extractTtcFace(
  'C:/Windows/Fonts/msyhbd.ttc',
  path.join(fontsDir, 'MicrosoftYaHei-Bold.ttf')
)
console.log('Prepared local demo PDF fonts in public/fonts')
