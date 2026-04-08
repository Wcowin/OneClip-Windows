#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

function parseArgs(argv) {
  const result = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      result[key] = 'true'
      continue
    }
    result[key] = next
    i += 1
  }
  return result
}

function getRequired(args, key) {
  const value = args[key]
  if (!value || value === 'true') {
    throw new Error(`缺少必填参数 --${key}`)
  }
  return value
}

function readOptionalFile(filePath) {
  if (!filePath) return ''
  return fs.readFileSync(filePath, 'utf8').trim()
}

function usage() {
  console.log(`
用法:
  node scripts/build-updater-latest-json.mjs \\
    --version 1.0.1 \\
    --url https://github.com/Wcowin/OneClip-Windows/releases/download/v1.0.1/OneClip_1.0.1_x64-setup.exe \\
    --signature-file ./src-tauri/target/release/bundle/nsis/OneClip_1.0.1_x64-setup.exe.sig \\
    [--platform windows-x86_64] \\
    [--notes "更新说明"] \\
    [--notes-file ./release-notes.txt] \\
    [--pub-date 2026-04-08T12:00:00Z] \\
    [--output ./latest.json]
`)
}

try {
  const args = parseArgs(process.argv.slice(2))

  if (args.help === 'true' || args.h === 'true') {
    usage()
    process.exit(0)
  }

  const version = getRequired(args, 'version')
  const url = getRequired(args, 'url')
  const platform = args.platform || 'windows-x86_64'
  const output = args.output || 'latest.json'
  const pubDate = args['pub-date'] || new Date().toISOString()

  const signature = args.signature
    ? args.signature.trim()
    : readOptionalFile(args['signature-file'])

  if (!signature) {
    throw new Error('需要提供 --signature 或 --signature-file')
  }

  const notesFromArg = args.notes ?? ''
  const notesFromFile = readOptionalFile(args['notes-file'])
  const notes = notesFromFile || notesFromArg

  const payload = {
    version,
    notes,
    pub_date: pubDate,
    platforms: {
      [platform]: {
        signature,
        url,
      },
    },
  }

  const outputPath = path.resolve(output)
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`已生成: ${outputPath}`)
} catch (error) {
  console.error(`生成 latest.json 失败: ${error instanceof Error ? error.message : String(error)}`)
  usage()
  process.exit(1)
}
