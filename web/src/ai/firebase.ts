import { initializeApp, type FirebaseApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { fetchAndActivate, getRemoteConfig, getValue, type RemoteConfig } from 'firebase/remote-config'
import { doc, getFirestore, increment, setDoc, getDoc, type Firestore } from 'firebase/firestore'
import { getAI, GoogleAIBackend, type AI } from 'firebase/ai'

const env = import.meta.env
export const configured = Boolean(env.VITE_FB_API_KEY && env.VITE_FB_PROJECT_ID && env.VITE_FB_APP_ID)

/** Policy defaults; Remote Config overrides them without a redeploy. */
export const POLICY_DEFAULTS = {
  cloud_model: 'gemini-3.8-flash',
  redaction_strictness: 'strict',
  allow_manual_airlock: true,
  send_icd: false,
  audit_prompt_version: 'v1',
  max_lines: 60,
}
export type Policy = typeof POLICY_DEFAULTS

let app: FirebaseApp | undefined
let ai: AI | undefined
let db: Firestore | undefined
let rc: RemoteConfig | undefined
let ready: Promise<void> | undefined

export function firebase() {
  if (!configured) throw new Error('Firebase is not configured: copy web/.env.example to web/.env.local')
  if (!app) {
    if (new URLSearchParams(location.search).has('debug-appcheck')) {
      ;(self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true
    }
    app = initializeApp({
      apiKey: env.VITE_FB_API_KEY,
      authDomain: env.VITE_FB_AUTH_DOMAIN,
      projectId: env.VITE_FB_PROJECT_ID,
      appId: env.VITE_FB_APP_ID,
    })
    if (env.VITE_RECAPTCHA_SITE_KEY) {
      // 'enterprise' (default) or 'v3', matching the provider registered in App Check
      const provider = env.VITE_RECAPTCHA_PROVIDER === 'v3'
        ? new ReCaptchaV3Provider(env.VITE_RECAPTCHA_SITE_KEY)
        : new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_SITE_KEY)
      initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true })
    }
    ai = getAI(app, { backend: new GoogleAIBackend() })
    db = getFirestore(app)
    rc = getRemoteConfig(app)
    rc.settings.minimumFetchIntervalMillis = 3_600_000
    rc.defaultConfig = POLICY_DEFAULTS
  }
  return { app: app!, ai: ai!, db: db!, rc: rc! }
}

/** Sign in anonymously and load policy. Safe to call repeatedly. */
export function boot(): Promise<void> {
  if (!configured) return Promise.resolve()
  ready ??= (async () => {
    const { app, rc } = firebase()
    await Promise.allSettled([signInAnonymously(getAuth(app)), fetchAndActivate(rc)])
  })()
  return ready
}

export function policy(): Policy {
  if (!configured || !rc) return POLICY_DEFAULTS
  return {
    cloud_model: getValue(rc, 'cloud_model').asString() || POLICY_DEFAULTS.cloud_model,
    redaction_strictness: getValue(rc, 'redaction_strictness').asString(),
    allow_manual_airlock: getValue(rc, 'allow_manual_airlock').asBoolean(),
    send_icd: getValue(rc, 'send_icd').asBoolean(),
    audit_prompt_version: getValue(rc, 'audit_prompt_version').asString(),
    max_lines: getValue(rc, 'max_lines').asNumber() || POLICY_DEFAULTS.max_lines,
  }
}

export type Outcome = 'disputed' | 'won' | 'lost'

/** Anonymous counters only: a finding kind and one +1. No uid, amount or text. */
export async function reportOutcome(kind: string, outcome: Outcome): Promise<void> {
  if (!configured) return
  await boot()
  const { db } = firebase()
  await setDoc(doc(db, 'outcomes', kind), { [outcome]: increment(1) }, { merge: true })
}

export async function readOutcomes(kinds: string[]): Promise<Record<string, Partial<Record<Outcome, number>>>> {
  if (!configured) return {}
  await boot()
  const { db } = firebase()
  const out: Record<string, Partial<Record<Outcome, number>>> = {}
  await Promise.all(kinds.map(async (k) => {
    const s = await getDoc(doc(db, 'outcomes', k))
    if (s.exists()) out[k] = s.data() as Partial<Record<Outcome, number>>
  }))
  return out
}
