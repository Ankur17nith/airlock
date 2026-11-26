import { useEffect, useState } from 'react'
import { nanoState, type NanoState } from './ai/nano'
import { ledger } from './airlock/ledger'

/** Gemini Nano availability in this browser. */
export function useNano() {
  const [state, setState] = useState<NanoState | 'checking'>('checking')
  useEffect(() => { nanoState().then(setState) }, [])
  return [state, setState] as const
}

/** Live view of the boundary ledger. */
export function useLedger() {
  const [entries, setEntries] = useState(ledger.all())
  useEffect(() => ledger.subscribe(setEntries), [])
  return entries
}
