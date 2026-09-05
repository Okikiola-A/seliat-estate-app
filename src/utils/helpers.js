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

// Converts this app's local Nigerian display format (e.g. "0801 234 5678",
// as produced by formatNigerianPhone above) into E.164 (e.g.
// "+2348012345678"), which is what Supabase's phone auth provider requires
// as the actual login identifier. These are two separate representations
// in two separate places: public.users.phone keeps the local format for
// display/contact purposes everywhere in the app (unchanged by any of
// this); auth.users.phone — set from this converted value at signup — is
// only ever touched by Supabase itself, for signInWithPassword({ phone })
// to match against.
export const toE164Nigerian = (phone) => {
  const digits = phone.replace(/\D/g, '')
  const national = digits.startsWith('0') ? digits.slice(1) : digits
  return `+234${national}`
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

// A resident (or an admin using their own code) can have at most one
// currently-usable code at a time — the rest are history. Used wherever a
// list of a person's codes needs to be split into "the one active code" vs
// "everything else" (ResidentScreen and AdminDashboard's own-code tab both
// need exactly this).
export const findActiveCode = (codes) => {
  const now = new Date()
  return codes.find(c => !c.used && !c.revoked && new Date(c.expires_at) > now) || null
}

export const getCodeStatus = (code) => {
  if (code.revoked) return { label: 'Revoked', color: '#475569', bg: '#F1F5F9', border: '#E2E8F0' }
  if (code.used) return { label: 'Used', color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' }
  if (new Date(code.expires_at) < new Date()) return { label: 'Expired', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' }
  return { label: 'Active', color: '#166534', bg: '#F0FDF4', border: '#BBF7D0' }
}

export const getAccessCodeShareMessage = (code, expiresAt) => {
  const expiry = new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `Hello, here is your access code for Seliat Estate:\n\nCode: *${code}*\n\nShow this code to the gate guard on arrival.\nValid until: ${expiry}\n\nDo not share this code with anyone else.`
}

// Opens the device's native share sheet so the user can pick WhatsApp, SMS,
// email, or whatever else is installed — instead of being locked into
// WhatsApp specifically. Falls back to a WhatsApp deep link on browsers/
// devices without navigator.share support (most desktop browsers, some
// older Android WebViews).
//
// Also attaches an actual QR image of the code to the shared message
// itself wherever the platform supports sharing files — the point is for
// the courier (who receives this message) to be able to show the QR at
// the gate for the guard to scan, not for the resident/admin generating
// the code to see it on their own screen at all.
export const shareAccessCode = async (code, expiresAt) => {
  const message = getAccessCodeShareMessage(code, expiresAt)

  let qrFile = null
  try {
    const { default: QRCode } = await import('qrcode')
    const dataUrl = await QRCode.toDataURL(code, { width: 480, margin: 2 })

    // Deliberately NOT fetch(dataUrl) -> .blob() here: the site's CSP
    // connect-src has no `data:` entry (and shouldn't need one just for
    // this), and Chromium browsers apply connect-src to fetch() calls
    // against data: URIs too. That fetch was being silently blocked,
    // thrown, and swallowed by this try/catch — so qrFile always ended up
    // null and every share silently fell back to text-only, on every
    // platform. Decoding the base64 payload by hand avoids the network
    // layer (and CSP) entirely, since it's just string/byte manipulation.
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    qrFile = new File([bytes], `seliat-access-code-${code}.png`, { type: 'image/png' })
  } catch {
    // QR generation failed for any reason (unsupported environment, etc.)
    // — not fatal, the share still goes ahead as text-only below since
    // qrFile is left as null.
  }

  if (navigator.share) {
    const canShareFile = !!qrFile && navigator.canShare?.({ files: [qrFile] })
    try {
      await navigator.share(
        canShareFile
          ? { title: 'Seliat Estate Access Code', text: message, files: [qrFile] }
          : { title: 'Seliat Estate Access Code', text: message }
      )
      return
    } catch (err) {
      // User cancelled the native share sheet — respect that, don't force
      // a WhatsApp fallback on top of a deliberate cancel.
      if (err.name === 'AbortError') return
      // Any other failure (share target crashed, unsupported payload,
      // etc.) falls through to the WhatsApp link below instead of leaving
      // the user with no way to share at all.
    }
  }

  // wa.me is a plain URL scheme — it can only carry text, never a file
  // attachment, so this path is always text-only regardless of qrFile.
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
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