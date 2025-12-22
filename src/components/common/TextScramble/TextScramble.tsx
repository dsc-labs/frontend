import { useEffect, useRef, useState } from 'react'
import './TextScramble.css'

interface TextScrambleProps {
  text: string
  speed?: number
  className?: string
}

const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

const TextScramble = ({ text, speed = 50, className = '' }: TextScrambleProps) => {
  const [displayText, setDisplayText] = useState<string[]>([])
  const frameRef = useRef(0)
  const queueRef = useRef<Array<{ from: string; to: string; start: number; end: number }>>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isInitializedRef = useRef(false)

  useEffect(() => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    const setText = (newText: string) => {
      const oldText = displayText.length > 0 ? displayText.join('') : newText
      const length = Math.max(oldText.length, newText.length)
      queueRef.current = []

      for (let i = 0; i < length; i++) {
        const from = oldText[i] || ''
        const to = newText[i] || ''
        const start = Math.floor(Math.random() * 40)
        const end = start + Math.floor(Math.random() * 40) + 20
        queueRef.current.push({ from, to, start, end })
      }

      frameRef.current = 0
      update()
    }

    const update = () => {
      const output: string[] = []
      let complete = 0

      for (let i = 0; i < queueRef.current.length; i++) {
        const { from, to, start, end } = queueRef.current[i]

        if (frameRef.current >= end) {
          complete++
          output.push(to)
        } else if (frameRef.current >= start) {
          if (from === to) {
            output.push(to)
          } else {
            const char = chars[Math.floor(Math.random() * chars.length)]
            output.push(char)
          }
        } else {
          output.push(from || '')
        }
      }

      setDisplayText(output)

      if (complete === queueRef.current.length) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else {
        frameRef.current++
      }
    }

    // Initialize with scrambled text
    const scrambled = text
      .split('')
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join('')

    setDisplayText(scrambled.split(''))

    setTimeout(() => {
      setText(text)

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      intervalRef.current = setInterval(() => {
        update()
      }, speed)
    }, 100)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      isInitializedRef.current = false
    }
  }, []) // Empty dependency array

  return (
    <span className={`text-scramble ${className}`}>
      {displayText.length > 0 ? (
        displayText.map((char, index) => (
          <span key={index} className="scramble-char">
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))
      ) : (
        <span>{text}</span>
      )}
    </span>
  )
}

export default TextScramble
