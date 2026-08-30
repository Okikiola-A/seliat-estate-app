import { useEffect, useRef, useState } from 'react'

// Encodes the access code as a QR image — deliberately just the plain code
// string (e.g. "AB3K9Z"), nothing more. That keeps the guard-side scanner
// trivial: whatever it decodes is fed straight into the exact same
// verifyCode() flow already used for manual typed entry, so scanning isn't
// a separate, second system to keep correct — it's the same one code path
// with an extra way to get the string into it.
//
// `qrcode` is loaded via dynamic import rather than a static one, since
// this project's build (Rolldown) was found to silently tree-shake the
// statically-imported CommonJS package out of the production bundle
// entirely, with no error — a dynamic import puts it in its own chunk and
// avoids whatever static-analysis path was causing that.
export default function AccessCodeQr({ code, size = 180 }) {
  const canvasRef = useRef(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!canvasRef.current || !code) return
    let cancelled = false
    setError(false)

    import('qrcode').then(({ default: QRCode }) => {
      if (cancelled || !canvasRef.current) return
      QRCode.toCanvas(canvasRef.current, code, {
        width: size,
        margin: 1,
        // Deliberately always plain black-on-white, regardless of the
        // app's light/dark theme — a themed (e.g. inverted) QR code can be
        // harder for a camera to decode reliably in real gate lighting
        // conditions, and scan reliability matters more here than visual
        // consistency.
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      }).catch(() => { if (!cancelled) setError(true) })
    }).catch(() => { if (!cancelled) setError(true) })

    return () => { cancelled = true }
  }, [code, size])

  if (error) return null

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '10px',
      padding: '0.6rem',
      display: 'inline-flex',
    }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ display: 'block' }}
      />
    </div>
  )
}