import type { Identity } from './types'

/**
 * Vault persistence: IndexedDB, AES-GCM, with a non-extractable WebCrypto key
 * that is itself stored in IndexedDB (CryptoKey objects can be stored but not
 * read out). Lets a user close the tab and come back to their letter within
 * 24 hours. Nothing here is ever synced.
 */
const DB = 'airlock'
const TTL_MS = 24 * 60 * 60 * 1000

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore('kv')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const r = fn(db.transaction('kv', mode).objectStore('kv'))
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  }).finally(() => db.close())
}

async function key(): Promise<CryptoKey> {
  const existing = await tx<CryptoKey | undefined>('readonly', (s) => s.get('key'))
  if (existing) return existing
  const k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  await tx('readwrite', (s) => s.put(k, 'key'))
  return k
}

export async function saveIdentity(identity: Identity): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(JSON.stringify({ identity, savedAt: Date.now() }))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), data)
  await tx('readwrite', (s) => s.put({ iv, ct }, 'vault'))
}

export async function loadIdentity(now = Date.now()): Promise<Identity | null> {
  const rec = await tx<{ iv: Uint8Array; ct: ArrayBuffer } | undefined>('readonly', (s) => s.get('vault'))
  if (!rec) return null
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: rec.iv as BufferSource }, await key(), rec.ct)
  const { identity, savedAt } = JSON.parse(new TextDecoder().decode(pt)) as { identity: Identity; savedAt: number }
  if (now - savedAt > TTL_MS) { await forget(); return null }
  return identity
}

/** "Forget this bill": delete the vault and its key. */
export async function forget(): Promise<void> {
  await tx('readwrite', (s) => s.delete('vault'))
  await tx('readwrite', (s) => s.delete('key'))
}
