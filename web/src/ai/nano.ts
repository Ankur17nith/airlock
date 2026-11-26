/** Chrome's Prompt API availability, for the UI only. Kept free of Firebase imports so the landing page doesn't load the SDK. */
export type NanoState = 'unsupported' | 'unavailable' | 'downloadable' | 'downloading' | 'available'
interface LanguageModelStatic { availability(o?: object): Promise<string> }

export async function nanoState(): Promise<NanoState> {
  const LM = (globalThis as unknown as { LanguageModel?: LanguageModelStatic }).LanguageModel
  if (!LM) return 'unsupported'
  try {
    return (await LM.availability({ expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }] })) as NanoState
  } catch {
    return 'unavailable'
  }
}

