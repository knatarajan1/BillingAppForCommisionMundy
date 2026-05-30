import { useState, useRef, useEffect, useLayoutEffect, forwardRef } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { transliterate, removeLastTamilChar } from '../lib/transliterate'

/**
 * Drop-in replacement for <input> / <textarea> with live Tamil phonetic
 * transliteration when app language = 'ta'.
 *
 * Typing guide (Tamil mode):
 *   thakkaLi  → தக்காளி   (L = ள retroflex)
 *   vengaayam → வெங்காயம் (aa = long ஆ)
 *   PoosaNi   → பூசணி     (N = ண retroflex)
 *   Sree      → ஸ்ரீ       (S = Grantha ஸ)
 *   jangal    → ஜங்கல்    (j = ஜ Grantha)
 *
 * In English mode this is a transparent pass-through.
 * Transliteration never activates for type="number", "tel", or "date".
 *
 * Full editing support:
 *   Ctrl+C / Ctrl+A / Ctrl+Z  — pass through to browser natively
 *   Ctrl+V  — paste plain text at cursor / replacing selection
 *   Ctrl+X  — cut selected text (copies + removes)
 *   Backspace on selection   — deletes selected range
 *   Delete on selection      — deletes selected range
 *   Arrow keys + Shift       — extend selection natively
 *   Direct Tamil OS keyboard — Tamil chars pass through unchanged
 */
const TamilInput = forwardRef(function TamilInput(
  { value, onChange, type, rows, className, placeholder, autoFocus,
    onKeyDown: outerKeyDown, ...rest },
  fwdRef
) {
  const { lang } = useLanguage()
  const isTamil = lang === 'ta' && type !== 'number' && type !== 'tel' && type !== 'date'

  // Internal DOM ref — also forwards to caller's ref
  const domRef = useRef(null)

  function attachRef(el) {
    domRef.current = el
    if (typeof fwdRef === 'function') fwdRef(el)
    else if (fwdRef) fwdRef.current = el
  }

  // ── State ────────────────────────────────────────────────────
  // baseTamil: committed Tamil text (pre-existing or committed words)
  // engBuffer: in-progress English phonetics being composed right now
  const [baseTamil, setBaseTamil] = useState(value || '')
  const [engBuffer, setEngBuffer] = useState('')
  const lastSentRef = useRef(value || '')

  // Cursor position to restore after re-render
  const cursorRef = useRef(null)

  // Restore cursor position after every Tamil-mode render
  useLayoutEffect(() => {
    if (!isTamil || cursorRef.current === null) return
    const el = domRef.current
    if (el && document.activeElement === el) {
      el.setSelectionRange(cursorRef.current, cursorRef.current)
      cursorRef.current = null
    }
  })

  // Sync when parent resets value (form clear/load)
  useEffect(() => {
    if (!isTamil) return
    const v = value || ''
    if (v !== lastSentRef.current) {
      setBaseTamil(v)
      setEngBuffer('')
      lastSentRef.current = v
    }
  }, [value, isTamil])

  // ── English / numeric mode: transparent pass-through ─────────
  if (!isTamil) {
    const Tag = rows ? 'textarea' : 'input'
    return (
      <Tag
        ref={attachRef}
        type={rows ? undefined : (type || 'text')}
        rows={rows}
        className={className}
        placeholder={placeholder}
        autoFocus={autoFocus}
        value={value ?? ''}
        onChange={onChange}
        onKeyDown={outerKeyDown}
        {...rest}
      />
    )
  }

  // ── Tamil mode helpers ───────────────────────────────────────
  const tamilSuffix  = transliterate(engBuffer)
  const displayValue = baseTamil + tamilSuffix

  function emit(newBase, newEng) {
    const full = newBase + transliterate(newEng)
    lastSentRef.current = full
    onChange?.({ target: { value: full } })
  }

  function commitAndSet(newBase, newEng = '') {
    setBaseTamil(newBase)
    setEngBuffer(newEng)
    emit(newBase, newEng)
  }

  // Return selection range from DOM (or null if no selection)
  function getSelection() {
    const el = domRef.current
    if (!el) return null
    const s = el.selectionStart
    const e = el.selectionEnd
    return s !== e ? { start: s, end: e } : null
  }

  // Delete the selected range from displayValue, reset eng buffer
  function deleteSelection(sel) {
    const newVal = displayValue.slice(0, sel.start) + displayValue.slice(sel.end)
    cursorRef.current = sel.start
    commitAndSet(newVal, '')
  }

  // ── Key handler ──────────────────────────────────────────────
  function handleKeyDown(e) {
    // Fire outer handler first (e.g. Enter-to-submit in SmartSelect)
    outerKeyDown?.(e)
    if (e.defaultPrevented) return

    // Skip IME composition events (OS Tamil/Hindi keyboards)
    if (e.isComposing || e.nativeEvent?.isComposing) return

    // ── Browser shortcuts: always pass through ───────────────
    if (e.ctrlKey || e.altKey || e.metaKey) {
      // Ctrl+X (cut): let browser copy, then delete the selection
      if (e.ctrlKey && (e.key === 'x' || e.key === 'X')) {
        const sel = getSelection()
        if (sel) {
          // Browser will copy; we schedule deletion
          const curDisplay = displayValue
          const selStart   = sel.start
          const selEnd     = sel.end
          requestAnimationFrame(() => {
            const newVal = curDisplay.slice(0, selStart) + curDisplay.slice(selEnd)
            cursorRef.current = selStart
            setBaseTamil(newVal)
            setEngBuffer('')
            lastSentRef.current = newVal
            onChange?.({ target: { value: newVal } })
          })
        }
      }
      return  // allow all ctrl/alt/meta keys natively
    }

    // ── Navigation keys (with or without Shift for selection) ─
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
         'Home', 'End', 'PageUp', 'PageDown', 'Tab', 'Escape',
         'CapsLock', 'Shift'].includes(e.key)) return

    // Function keys
    if (e.key.startsWith('F') && e.key.length > 1) return

    // ── All other keys: prevent browser's default edit ───────
    e.preventDefault()

    const sel = getSelection()

    // Backspace
    if (e.key === 'Backspace') {
      if (sel) { deleteSelection(sel); return }
      if (engBuffer.length > 0) {
        const nb = engBuffer.slice(0, -1)
        setEngBuffer(nb)
        emit(baseTamil, nb)
      } else if (baseTamil.length > 0) {
        const nb = removeLastTamilChar(baseTamil)
        cursorRef.current = nb.length
        commitAndSet(nb, '')
      }
      return
    }

    // Delete
    if (e.key === 'Delete') {
      if (sel) { deleteSelection(sel); return }
      // Delete without selection → clear whole field
      cursorRef.current = 0
      commitAndSet('', '')
      return
    }

    // Enter (only meaningful in textarea)
    if (e.key === 'Enter') {
      if (rows) {
        const nb = baseTamil + transliterate(engBuffer) + '\n'
        commitAndSet(nb, '')
      }
      return
    }

    // Space — commits current phonetic buffer, adds a space
    if (e.key === ' ') {
      const nb = baseTamil + transliterate(engBuffer) + ' '
      commitAndSet(nb, '')
      return
    }

    // Printable character (including direct Tamil Unicode from OS keyboard)
    if (e.key.length === 1) {
      if (sel) {
        // Replace selection: keep text before sel.start, start fresh phonetic
        const before = displayValue.slice(0, sel.start)
        setBaseTamil(before)
        const nb = e.key
        setEngBuffer(nb)
        emit(before, nb)
        return
      }
      const nb = engBuffer + e.key
      setEngBuffer(nb)
      emit(baseTamil, nb)
    }
  }

  // ── Paste handler ────────────────────────────────────────────
  function handlePaste(e) {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData)?.getData('text/plain') || ''
    if (!pasted) return

    const sel = getSelection()
    if (sel) {
      // Replace selection with pasted text
      const newVal = displayValue.slice(0, sel.start) + pasted + displayValue.slice(sel.end)
      cursorRef.current = sel.start + pasted.length
      commitAndSet(newVal, '')
    } else {
      // Append pasted text after committing current phonetic buffer
      const newBase = baseTamil + transliterate(engBuffer) + pasted
      commitAndSet(newBase, '')
    }
  }

  // ── Render ───────────────────────────────────────────────────
  const Tag = rows ? 'textarea' : 'input'
  return (
    <Tag
      ref={attachRef}
      type={rows ? undefined : 'text'}
      rows={rows}
      className={className}
      placeholder={placeholder}
      autoFocus={autoFocus}
      value={displayValue}
      onChange={() => {}}   // controlled via onKeyDown + onPaste
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      spellCheck={false}
      title={engBuffer ? `Phonetic: ${engBuffer}` : undefined}
      {...rest}
    />
  )
})

export default TamilInput
