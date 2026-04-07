import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const SALT_BYTES = 16
const KEY_LEN = 64

export const hashPassword = (password: string): string => {
  const salt = randomBytes(SALT_BYTES)
  const derived = scryptSync(password, salt, KEY_LEN)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

export const verifyPassword = (password: string, stored: string): boolean => {
  if (!stored) return false
  const [saltHex, derivedHex] = stored.split(':')
  if (!saltHex || !derivedHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const derived = Buffer.from(derivedHex, 'hex')
  const check = scryptSync(password, salt, derived.length)
  try {
    return timingSafeEqual(derived, check)
  } catch (e) {
    return false
  }
}
