import React, { createContext, useContext, useEffect, useState } from 'react'

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

  const setUser = (nextUser) => {
    setUserState(nextUser)

    try {
      if (nextUser) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser))
      } else {
        localStorage.removeItem(AUTH_USER_KEY)
      }
    } catch (_) {}
  }

  useEffect(() => {
    const sync = (event) => {
      if (event.key === AUTH_USER_KEY) {
        setUserState(readStoredUser())
      }
    }

    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)