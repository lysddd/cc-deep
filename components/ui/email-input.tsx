'use client'

import { useState, useRef, useEffect } from 'react'

const COMMON_DOMAINS = [
  '@qq.com', '@163.com', '@126.com', '@gmail.com', '@outlook.com',
  '@hotmail.com', '@foxmail.com', '@sina.com', '@sohu.com', '@yeah.net',
  '@139.com', '@189.cn', '@icloud.com', '@proton.me', '@aliyun.com',
]

interface Props {
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  className?: string
}

export function EmailInput({ value, onChange, required, placeholder, className }: Props) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(val: string) {
    onChange(val)

    // Check if user has typed something before @ that could use domain completion
    const atIndex = val.indexOf('@')
    if (atIndex > 0) {
      // User already typed @, filter matching domains
      const domainPart = val.slice(atIndex)
      const matches = COMMON_DOMAINS.filter(d => d.startsWith(domainPart) && d !== domainPart)
      setSuggestions(matches)
      setShowDropdown(matches.length > 0)
    } else if (val.length > 0 && !val.includes('@')) {
      // User hasn't typed @ yet, suggest prefix + domains
      const prefix = val
      setSuggestions(COMMON_DOMAINS.map(d => prefix + d))
      setShowDropdown(true)
    } else {
      setShowDropdown(false)
    }
  }

  function selectSuggestion(suggestion: string) {
    onChange(suggestion)
    setShowDropdown(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="email"
        value={value}
        onChange={e => handleChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className={className}
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => selectSuggestion(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
