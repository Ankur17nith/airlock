import type { LedgerEntry } from './types'

type Listener = (entries: readonly LedgerEntry[]) => void

/** Append-only record of everything that happened at the boundary. */
class Ledger {
  private entries: LedgerEntry[] = []
  private listeners = new Set<Listener>()
  private next = 1

  add(e: Omit<LedgerEntry, 'id' | 'at'>): LedgerEntry {
    const entry = { ...e, id: this.next++, at: Date.now() }
    this.entries = [...this.entries, entry]
    this.listeners.forEach((l) => l(this.entries))
    return entry
  }
  all(): readonly LedgerEntry[] { return this.entries }
  subscribe(l: Listener): () => void {
    this.listeners.add(l)
    return () => { this.listeners.delete(l) }
  }
  clear() { this.entries = []; this.listeners.forEach((l) => l(this.entries)) }
  bytesOut() { return this.entries.filter((e) => e.direction === 'out' && e.verdict === 'passed').reduce((a, e) => a + e.bytes, 0) }
  export(): string { return JSON.stringify(this.entries, null, 2) }
}

export const ledger = new Ledger()
export type { Ledger }
