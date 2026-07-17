import { useState } from 'react'
import { supabase } from '../supabase'
import { lightTheme, darkTheme } from './themeTokens'
import { ThemeContext } from './useTheme'

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('seliat-theme')
    return saved ? saved === 'dark' : false
  })

  const theme = isDark ? darkTheme : lightTheme

  // Toggle for a logged-in user: updates local state + persists to their profile row.
  // Falls back to localStorage-only if no userId is passed (e.g. pre-login screens).
  const toggleTheme = async (userId) => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('seliat-theme', next ? 'dark' : 'light')

    if (userId) {
      const { error } = await supabase
        .from('users')
        .update({ dark_mode: next })
        .eq('id', userId)

      if (error) {
        // Revert on failure so the UI doesn't lie about what's actually saved
        setIsDark(!next)
        localStorage.setItem('seliat-theme', !next ? 'dark' : 'light')
        console.error('Failed to save theme preference:', error)
      }
    }
  }

  // Called once a profile loads (after login) to sync the account's saved preference
  const applyUserTheme = (darkMode) => {
    setIsDark(!!darkMode)
    localStorage.setItem('seliat-theme', darkMode ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, applyUserTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}