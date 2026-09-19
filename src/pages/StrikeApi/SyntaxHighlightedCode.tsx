import { Fragment } from 'react'
import type { ApiLanguage } from './apiContent'

type SyntaxHighlightedCodeProps = {
  code: string
  language: ApiLanguage
}

type TokenTone = 'comment' | 'flag' | 'keyword' | 'number' | 'status' | 'string'

const TOKEN_PATTERN = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:curl|from|import|const|await|new)\b|\s-(?:X|H|d)\b|^-(?:X|H|d)\b|\b\d+(?:\.\d+)?\b)/g

function getTokenTone(token: string): TokenTone {
  const value = token.trim()

  if (/^-(?:X|H|d)$/.test(value)) return 'flag'
  if (/^(?:curl|from|import|const|await|new)$/.test(value)) return 'keyword'
  if (/^\d+(?:\.\d+)?$/.test(value)) return 'number'
  if (/^["'`](?:COMPLETED|QUEUED)["'`]$/.test(value)) return 'status'
  return 'string'
}

function renderLine(line: string, lineIndex: number, language: ApiLanguage) {
  const trimmed = line.trimStart()
  const isComment = language === 'node' ? trimmed.startsWith('//') : trimmed.startsWith('#')

  if (isComment) {
    return (
      <span className="strike-api__syntax--comment" key={'comment-' + lineIndex}>
        {line}
      </span>
    )
  }

  const output = []
  let cursor = 0
  let match: RegExpExecArray | null
  TOKEN_PATTERN.lastIndex = 0

  while ((match = TOKEN_PATTERN.exec(line)) !== null) {
    if (match.index > cursor) output.push(line.slice(cursor, match.index))
    const token = match[0]
    const tone = getTokenTone(token)
    output.push(
      <span className={'strike-api__syntax--' + tone} key={lineIndex + '-' + match.index}>
        {token}
      </span>,
    )
    cursor = match.index + token.length
  }

  if (cursor < line.length) output.push(line.slice(cursor))
  return output
}

export function SyntaxHighlightedCode({ code, language }: SyntaxHighlightedCodeProps) {
  const lines = code.split('\n')

  return (
    <code>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {renderLine(line, index, language)}
          {index < lines.length - 1 ? '\n' : null}
        </Fragment>
      ))}
    </code>
  )
}
