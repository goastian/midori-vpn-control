import { describe, expect, it } from 'vitest'
import {
  RESOURCE_STATES,
  beginResourceLoad,
  completeResourceLoad,
  hasUsableResourceValue,
} from '../../lib/resource-state'

describe('resource state transitions', () => {
  it('exposes the complete resource-state contract', () => {
    expect(RESOURCE_STATES).toEqual(['idle', 'loading', 'ready', 'empty', 'error', 'refreshing'])
  })

  it('distinguishes an initial load from a refresh', () => {
    expect(beginResourceLoad(false)).toBe('loading')
    expect(beginResourceLoad(true)).toBe('refreshing')
  })

  it('distinguishes ready data from a valid empty result', () => {
    expect(completeResourceLoad(false)).toBe('empty')
    expect(completeResourceLoad(true)).toBe('ready')
  })

  it('never treats empty or error as usable data', () => {
    expect(hasUsableResourceValue('ready')).toBe(true)
    expect(hasUsableResourceValue('refreshing')).toBe(true)
    expect(hasUsableResourceValue('empty')).toBe(false)
    expect(hasUsableResourceValue('error')).toBe(false)
  })
})
