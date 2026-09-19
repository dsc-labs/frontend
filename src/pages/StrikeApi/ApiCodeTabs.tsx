import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Check, Copy } from 'lucide-react'
import {
  API_CODE_SAMPLES,
  API_LANGUAGES,
  type ApiLanguage,
} from './apiContent'
import { SyntaxHighlightedCode } from './SyntaxHighlightedCode'

type CodeCopyButtonProps = {
  value: string
  compact?: boolean
}

export function CodeCopyButton({ value, compact = false }: CodeCopyButtonProps) {
  const [label, setLabel] = useState('Copy')
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    },
    [],
  )

  const copy = async () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setLabel('Copied')
    } catch {
      setLabel('Copy failed')
    }
    resetTimerRef.current = setTimeout(() => setLabel('Copy'), 1600)
  }

  return (
    <button
      type="button"
      className={'strike-api__copy' + (compact ? ' strike-api__copy--compact' : '')}
      onClick={copy}
      aria-label={label + ' code'}
    >
      {label === 'Copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span>{label}</span>
    </button>
  )
}

export function ApiCodeTabs() {
  const [activeLanguage, setActiveLanguage] = useState<ApiLanguage>('curl')
  const activeSample = API_CODE_SAMPLES[activeLanguage]

  const focusTab = (language: ApiLanguage) => {
    setActiveLanguage(language)
    document.getElementById('api-tab-' + language)?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()

    if (event.key === 'Home') return focusTab(API_LANGUAGES[0])
    if (event.key === 'End') return focusTab(API_LANGUAGES[API_LANGUAGES.length - 1])

    const offset = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (index + offset + API_LANGUAGES.length) % API_LANGUAGES.length
    focusTab(API_LANGUAGES[nextIndex])
  }

  return (
    <div className="strike-api__terminal strike-api__terminal--tabs">
      <div className="strike-api__terminal-header">
        <div className="strike-api__tabs" role="tablist" aria-label="API code examples">
          {API_LANGUAGES.map((language, index) => {
            const sample = API_CODE_SAMPLES[language]
            const selected = language === activeLanguage
            return (
              <button
                key={language}
                id={'api-tab-' + language}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={'api-panel-' + language}
                tabIndex={selected ? 0 : -1}
                className="strike-api__tab"
                onClick={() => setActiveLanguage(language)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              >
                {sample.label}
              </button>
            )
          })}
        </div>
        <CodeCopyButton value={activeSample.code} />
      </div>
      <div
        id={'api-panel-' + activeLanguage}
        role="tabpanel"
        aria-labelledby={'api-tab-' + activeLanguage}
        className="strike-api__code-panel"
      >
        <pre>
          <SyntaxHighlightedCode code={activeSample.code} language={activeLanguage} />
        </pre>
      </div>
    </div>
  )
}
