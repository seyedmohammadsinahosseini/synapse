import { createContext, useContext, useState } from 'react'
import { getUser, setSession, clearSession, getToken } from './api.js'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUser())

  const login = (token, u) => {
    setSession(token, u)
    setUser(u)
  }
  // refresh the stored user object (e.g. after editing the profile)
  const update = (u) => {
    const token = getToken()
    if (token) setSession(token, u)
    setUser(u)
  }
  const logout = () => {
    clearSession()
    setUser(null)
  }
  return (
    <AuthCtx.Provider value={{ user, login, logout, update }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
