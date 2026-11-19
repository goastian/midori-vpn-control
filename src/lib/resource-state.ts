export const RESOURCE_STATES = ['idle', 'loading', 'ready', 'empty', 'error', 'refreshing'] as const

export type ResourceState = typeof RESOURCE_STATES[number]

export function beginResourceLoad(hasUsableValue: boolean): ResourceState {
  return hasUsableValue ? 'refreshing' : 'loading'
}

export function completeResourceLoad(hasUsableValue: boolean): ResourceState {
  return hasUsableValue ? 'ready' : 'empty'
}

export function hasUsableResourceValue(state: ResourceState): boolean {
  return state === 'ready' || state === 'refreshing'
}
