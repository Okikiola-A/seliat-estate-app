// Math.random() is not cryptographically secure and shouldn't back access
// codes or temp passwords — both are real credentials. crypto.getRandomValues
// gives us a CSPRNG; the modulo bias here is negligible (max is at most a few
// dozen, against a 2^32 range) so plain modulo is fine without rejection
// sampling.
const secureRandomInt = (max) => {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return arr[0] % max
}

// Fisher-Yates — array.sort(() => Math.random() - 0.5) is both non-uniform
// (biased toward certain permutations) and, as above, not cryptographically
// random.
const secureShuffle = (arr) => {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(secureRandomInt(chars.length))
  }
  return code
}

export const formatNigerianPhone = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 4) return digits
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
}

export const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export const validatePhone = (phone) => {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('0')
}

export const validatePassword = (password) => {
  if (!password) return 'Please enter a password'
  if (password.length < 6) return 'Password must be at least 6 characters'
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one symbol'
  return null
}

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export const capitalizeName = (name) => {
  if (!name) return ''
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export const getCodeStatus = (code) => {
  if (code.revoked) return { label: 'Revoked', color: '#475569', bg: '#F1F5F9', border: '#E2E8F0' }
  if (code.used) return { label: 'Used', color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' }
  if (new Date(code.expires_at) < new Date()) return { label: 'Expired', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' }
  return { label: 'Active', color: '#166534', bg: '#F0FDF4', border: '#BBF7D0' }
}

export const generateTempPassword = () => {
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const numbers = '23456789'
  const symbols = '!@#$%&*'
  const all = lower + upper + numbers + symbols
  // Explicitly guarantee all four character classes Supabase's password
  // policy requires (lowercase, uppercase, digit, symbol) — picking "one
  // letter" from a combined upper+lower pool only guarantees *a* letter,
  // not both cases, which intermittently produced passwords Supabase
  // itself would then reject on signup.
  const pass = [
    lower.charAt(secureRandomInt(lower.length)),
    upper.charAt(secureRandomInt(upper.length)),
    numbers.charAt(secureRandomInt(numbers.length)),
    symbols.charAt(secureRandomInt(symbols.length)),
  ]
  for (let i = 0; i < 6; i++) pass.push(all.charAt(secureRandomInt(all.length)))
  return secureShuffle(pass).join('')
}