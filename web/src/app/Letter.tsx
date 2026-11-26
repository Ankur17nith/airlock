import { motion } from 'motion/react'
import { Fragment, useState, type ReactNode } from 'react'
import type { Vault } from '../airlock/vault'

const TOKEN = /(⟦[A-Z_]+⟧|\[\[[A-Z_]+\]\]|\{\{[A-Z_]+\}\})/g
const nameOf = (t: string) => t.replace(/[⟦⟧[\]{}]/g, '')

/** Inline markdown: **bold** first, then tokens inside each run. Tokens show as chips, or as filled values once rehydrated. */
function tokens(text: string, vault: Vault | null, filled: boolean, key: string): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    const k = `${key}-${i}`
    if (!/^(⟦[A-Z_]+⟧|\[\[[A-Z_]+\]\]|\{\{[A-Z_]+\}\})$/.test(part)) return <Fragment key={k}>{part}</Fragment>
    const field = nameOf(part)
    const value = vault?.identity[field as keyof Vault['identity']]
    if (filled && value) {
      return (
        <motion.span key={k} className="filled" initial={{ backgroundColor: 'var(--teal-wash)' }} animate={{ backgroundColor: 'rgba(0,0,0,0)' }} transition={{ duration: 1.6, delay: i * 0.05 }}>
          {value}
        </motion.span>
      )
    }
    return <span key={k} className="token" title={value ? 'Stays on this device' : 'Fill this in yourself'}>⟦{field}⟧</span>
  })
}
function inline(text: string, vault: Vault | null, filled: boolean, key: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((s, j) =>
    s.startsWith('**') && s.endsWith('**')
      ? <strong key={`${key}-b${j}`}>{tokens(s.slice(2, -2), vault, filled, `${key}-b${j}`)}</strong>
      : <Fragment key={`${key}-b${j}`}>{tokens(s, vault, filled, `${key}-b${j}`)}</Fragment>,
  )
}

export function LetterView({ text, vault, filled }: { text: string; vault: Vault | null; filled: boolean }) {
  const [today] = useState(() => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
  const blocks = text.replace(/\[DATE\]/g, today).split(/\n{2,}/)
  return (
    <div className="letter-paper" id="letter-print">
      {blocks.map((b, i) => {
        const lines = b.split('\n')
        if (lines.every((l) => /^\s*(\d+\.|-)\s/.test(l))) {
          const ordered = /^\s*\d+\./.test(lines[0])
          const items = lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*(\d+\.|-)\s/, ''), vault, filled, `${i}-${j}`)}</li>)
          return ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>
        }
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l, vault, filled, `${i}-${j}`)}</Fragment>)}</p>
      })}
    </div>
  )
}
