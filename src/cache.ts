import { asDate, asJSON, asObject, uncleaner } from 'cleaners'
import { readFileSync, writeFileSync } from 'fs'
import fetch from 'node-fetch'
import { join } from 'path'

const asTimes = asObject(asDate)
const asPackageCouch = asObject({ time: asTimes })
const asTimesCache = asJSON(asObject(asTimes))
const wasTimesCache = uncleaner(asTimesCache)

export class TimesCache {
  dirty: number = 0
  path: string
  cache: ReturnType<typeof asTimesCache> = {}

  constructor() {
    this.path = getCachePath()
    try {
      this.cache = asTimesCache(readFileSync(this.path, 'utf8'))
    } catch {}
  }

  async getTime(name: string, version: string): Promise<Date | undefined> {
    if (this.cache[name] != null) {
      const times = this.cache[name]
      if (times[version] != null) return times[version]
    }

    console.log('fetching ', name)
    const url = `https://registry.npmjs.com/${encodeURIComponent(name)}`
    const response = await fetch(url, {
      headers: { accept: 'application/json' }
    })
    if (response.status === 404) return undefined
    if (!response.ok) {
      throw new Error(`GET ${url} returned ${response.status}`)
    }
    const times = asPackageCouch(await response.json()).time
    this.cache[name] = times
    ++this.dirty
    if (this.dirty > 10) this.save()
    return times[version]
  }

  save(): void {
    writeFileSync(this.path, wasTimesCache(this.cache))
    this.dirty = 0
  }
}

function getCachePath(): string {
  if (process.env.XDG_CONFIG_HOME != null) {
    return join(process.env.XDG_CONFIG_HOME, 'scan-package-ages', 'cache.json')
  }
  if (process.env.HOME != null) {
    return join(process.env.HOME, '.config', 'scan-package-ages', 'cache.json')
  }
  return './timesCache.json'
}
