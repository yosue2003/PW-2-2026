import '@testing-library/jest-dom'

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
}
