import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/useTheme'

// Camera-based QR scanner used by the guard's gate-verification screen, as
// an alternative to typing the 6-character code by hand. The QR only ever
// encodes the plain code string itself (see helpers.js's shareAccessCode,
// which is what generates it) — so decoding it here needs no new backend
// call, it just hands the decoded string back to the exact same
// verifyCode() flow manual entry already uses.
//
// jsqr, like the qrcode package before it, is a CommonJS-only package with
// no module/exports field — Rolldown silently tree-shook a static import
// of qrcode out of the production bundle entirely earlier this project
// (see helpers.js's shareAccessCode for that history). Importing it
// dynamically here avoids repeating that bug.
export default function QrScanner({ onDecode, onClose }) {
  const { theme } = useTheme()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const decodedRef = useRef(false) // guards against firing onDecode more than once per scan session
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Your browser doesn't support camera access. Please enter the code manually instead.")
        return
      }

      let jsQR
      try {
        ;({ default: jsQR } = await import('jsqr'))
      } catch {
        setError('Could not load the QR scanner. Please enter the code manually instead.')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        video.srcObject = stream
        await video.play()

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d', { willReadFrequently: true })

        const tick = () => {
          if (cancelled || decodedRef.current) return
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const result = jsQR(imageData.data, imageData.width, imageData.height)
            if (result?.data) {
              decodedRef.current = true
              onDecode(result.data)
              return
            }
          }
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      } catch (err) {
        if (cancelled) return
        if (err.name === 'NotAllowedError') {
          setError('Camera access was denied. Please allow camera access, or enter the code manually instead.')
        } else if (err.name === 'NotFoundError') {
          setError('No camera was found on this device. Please enter the code manually instead.')
        } else {
          setError('Could not access the camera. Please enter the code manually instead.')
        }
      }
    }

    start()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
    // onDecode is passed fresh from GuardScreen on every render, but this
    // effect should only ever run once per mount (opening the camera is
    // expensive and re-running it on every parent re-render would
    // constantly restart the video stream) — the ref-based decodedRef
    // guard means a stale-closure onDecode is never actually a problem
    // here since it only ever fires once, right before this effect's own
    // cleanup runs anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem',
      fontFamily: "'DM Sans', sans-serif",
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: '12px',
      padding: '1.25rem',
      width: '100%',
      maxWidth: '380px',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    },
    title: {
      fontSize: '1rem',
      fontWeight: '800',
      color: theme.textPrimary,
      margin: 0,
      textAlign: 'center',
    },
    videoWrap: {
      position: 'relative',
      width: '100%',
      aspectRatio: '1',
      borderRadius: '10px',
      overflow: 'hidden',
      backgroundColor: '#000',
    },
    video: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    frame: {
      position: 'absolute',
      top: '12%',
      left: '12%',
      right: '12%',
      bottom: '12%',
      border: '3px solid rgba(255,255,255,0.85)',
      borderRadius: '12px',
      boxShadow: '0 0 0 999px rgba(0,0,0,0.35)',
      pointerEvents: 'none',
    },
    hint: {
      fontSize: '0.82rem',
      color: theme.textSecondary,
      margin: 0,
      textAlign: 'center',
      fontWeight: '500',
    },
    errorBox: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      alignItems: 'center',
      padding: '1.5rem 1rem',
      textAlign: 'center',
    },
    errorText: {
      fontSize: '0.85rem',
      color: theme.danger,
      margin: 0,
      fontWeight: '600',
      lineHeight: '1.5',
    },
    cancelBtn: {
      padding: '0.85rem',
      borderRadius: '6px',
      border: `1.5px solid ${theme.border}`,
      backgroundColor: theme.surface,
      color: theme.textSecondary,
      fontSize: '0.9rem',
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      width: '100%',
    },
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <p style={styles.title}>Scan Access Code</p>

        {error ? (
          <div style={styles.errorBox}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={theme.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={styles.errorText}>{error}</p>
          </div>
        ) : (
          <>
            <div style={styles.videoWrap}>
              <video ref={videoRef} style={styles.video} muted playsInline autoPlay />
              <div style={styles.frame} />
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <p style={styles.hint}>Point the camera at the courier's QR code</p>
          </>
        )}

        <button type="button" style={styles.cancelBtn} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}