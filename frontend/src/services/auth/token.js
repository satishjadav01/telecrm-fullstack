const ACCESS_TOKEN_KEY = 'telecrm.accessToken'
const REFRESH_TOKEN_KEY = 'telecrm.refreshToken'

const hasStorage = () => {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage)
  } catch {
    return false
  }
}

export const getAccessToken = () => {
  if (!hasStorage()) return null
  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

export const setAccessToken = (token) => {
  if (!hasStorage()) return
  if (!token) window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  else window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export const getRefreshToken = () => {
  if (!hasStorage()) return null
  return window.localStorage.getItem(REFRESH_TOKEN_KEY)
}

export const setRefreshToken = (token) => {
  if (!hasStorage()) return
  if (!token) window.localStorage.removeItem(REFRESH_TOKEN_KEY)
  else window.localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export const clearTokens = () => {
  setAccessToken(null)
  setRefreshToken(null)
}

export const tokenKeys = {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
}

