import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const UserContext = createContext(null)
const AUTH_USER_KEY = 'authUser'

const SELECTED_USER_KEYS = new Set([
  'selectedCompany',
  'selectedCompanyId',
  'selectedCompanyCode',
  'selectedDivision',
  'selectedJobLevel',
  'jobLevelRank',
])

function hasValue(value) {
  return value !== undefined && value !== null && value !== ''
}

function isDifferentUser(currentUser, nextUser) {
  const currentIdentity = currentUser?.id || currentUser?.internal_id || currentUser?.username || currentUser?.email
  const nextIdentity = nextUser?.id || nextUser?.internal_id || nextUser?.username || nextUser?.email
  return Boolean(currentIdentity && nextIdentity && String(currentIdentity) !== String(nextIdentity))
}

function mergeUserState(currentUser, nextUser, options = {}) {
  if (!currentUser) return nextUser
  if (!nextUser) return currentUser
  if (isDifferentUser(currentUser, nextUser)) return nextUser

  const merged = { ...currentUser, ...nextUser }

  for (const key of SELECTED_USER_KEYS) {
    const nextValue = nextUser[key]
    const currentValue = currentUser[key]

    if (!options.replaceSelection && hasValue(currentValue)) {
      merged[key] = currentValue
      continue
    }

    if (!hasValue(nextValue) && currentValue !== undefined) {
      merged[key] = currentValue
    }
  }

  return merged
}

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

  const setUser = useCallback((nextUser, options = {}) => {
    setUserState((currentUser) => {
      const mergedUser = mergeUserState(currentUser, nextUser, options)

      if (JSON.stringify(currentUser) === JSON.stringify(mergedUser)) {
        return currentUser
      }

      return mergedUser
    })

    try {
      if (nextUser) {
        const currentStoredUser = readStoredUser()
        const mergedStoredUser = mergeUserState(currentStoredUser, nextUser, options)
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(mergedStoredUser))
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
