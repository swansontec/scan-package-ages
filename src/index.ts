#!/usr/bin/env node

import { execSync } from 'child_process'
import { asJSON, asObject, asString } from 'cleaners'
import { readFileSync } from 'fs'

import { TimesCache } from './cache.js'

const asPackageJson = asJSON(asObject({ name: asString, version: asString }))

async function main(): Promise<void> {
  const now = Date.now()
  const timesCache = new TimesCache()

  // Find all package.json files:
  const packageFiles = execSync(
    'find node_modules -type f -name package.json',
    { encoding: 'utf8' }
  )
    .replace(/\n$/, '')
    .split('\n')

  // Load the package.json files:
  const out: { [name: string]: Date } = {}
  for (const file of packageFiles) {
    // Filter out package.json files in weird locations:
    if (!/node_modules\/[^/]+\/package.json/.test(file)) continue

    const { name, version } = asPackageJson(readFileSync(file, 'utf8'))
    const time = await timesCache.getTime(name, version)
    if (time == null) continue
    if (out[name] == null || out[name].valueOf() < time.valueOf()) {
      out[name] = time
    }
  }

  // Find the longest package name:
  const maxLength = Object.keys(out).reduce(
    (max, next) => Math.max(max, next.length),
    0
  )

  // Pretty-print the table:
  Object.keys(out)
    .sort((a, b) => out[a].valueOf() - out[b].valueOf())
    .forEach(name => {
      const age = (now - out[name].valueOf()) / (60 * 60 * 1000)
      const ageText =
        age < 24 ? `${age} hours}` : `${Math.floor(age / 24)} days`
      console.log(`${name + ' '.repeat(maxLength - name.length)} ${ageText}`)
    })

  timesCache.save()
}

main().catch(e => {
  process.exitCode = 1
  console.log(e)
})
