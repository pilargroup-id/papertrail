import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const UserContext = createContext(null)
const AUTH_USER_KEY = 'authUser'

function readStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (_) {
    return null
  }
}

export function UserProvider({ children }) {
  const [user, setUserState] = useState(readStoredUser)

  const setUser = useCallback((nextUser) => {
    setUserState((currentUser) => {
      if (JSON.stringify(currentUser) === JSON.stringify(nextUser)) {
        return currentUser
      }

      return nextUser
    })

    try {
      if (nextUser) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser))
      } else {
        localStorage.removeItem(AUTH_USER_KEY)
      }
    } catch (_) {}
  }, [])

  useEffect(() => {
    const sync = (event) => {
      if (event.key === AUTH_USER_KEY) {
        setUserState(readStoredUser())
      }
    }

    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const value = useMemo(() => ({ user, setUser }), [user, setUser])

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export const useUser = () => useContext(UserContext)
