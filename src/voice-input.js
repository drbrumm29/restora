// Browser SpeechRecognition wrapper — hold-to-talk for the waxup dialog.
//
// Uses the Web Speech API (Chrome/Edge/Safari desktop all support it;
// Firefox does not as of 2026). Returns a stateful controller the React
// component can start/stop and subscribe to for transcript updates.

export function createVoiceInput({ onPartial, onFinal, onError, onEnd } = {}) {
  const Ctor = typeof window !== 'undefined'
    && (window.SpeechRecognition || window.webkitSpeechRecognition)
  if (!Ctor) {
    return {
      supported: false,
      start: () => onError?.(new Error('SpeechRecognition not supported in this browser. Chrome/Edge/Safari desktop recommended.')),
      stop: () => {},
    }
  }

  const rec = new Ctor()
  rec.continuous = false          // short commands, stop after a pause
  rec.interimResults = true       // live transcript during speech
  rec.maxAlternatives = 1
  rec.lang = 'en-US'

  let finalText = ''
  let aborted = false

  rec.onresult = (evt) => {
    let partial = ''
    let fin = ''
    for (let i = evt.resultIndex; i < evt.results.length; i++) {
      const r = evt.results[i]
      if (r.isFinal) fin += r[0].transcript
      else partial += r[0].transcript
    }
    if (fin) finalText += fin
    if (partial) onPartial?.(finalText + partial)
    else if (fin) onPartial?.(finalText)
  }

  rec.onerror = (evt) => {
    if (aborted && evt.error === 'aborted') return
    onError?.(new Error(evt.error || 'speech-recognition-error'))
  }

  rec.onend = () => {
    onEnd?.()
    if (finalText.trim()) onFinal?.(finalText.trim())
  }

  return {
    supported: true,
    start() { finalText = ''; aborted = false; rec.start() },
    stop()  { aborted = true; rec.stop() },
  }
}
