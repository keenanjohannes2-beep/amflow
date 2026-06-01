'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    const type = params.get('type')

    if (!tokenHash || type !== 'recovery') {
      router.push('/login')
      return
    }

    supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
      .then(({ error }) => {
        if (error) {
          setError(error.message)
        } else {
          setReady(true)
        }
      })
  }, [router])

  const handleReset = async () => {
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f8' }}>
        <div style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '40px', width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: '#E8F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2"><path d="M20 6L9 17L4 12"/></svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Password updated</h1>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Your password has been reset successfully.</p>
          <a href="/login" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 8, background: '#1D9E75', color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Sign in</a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f8' }}>
      <div style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '40px', width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="white"><path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z"/></svg>
          </div>
          <span style={{ fontWeight: 500, fontSize: 15 }}>AMflow</span>
        </div>

        {!ready && !error ? (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Verifying...</h1>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Checking your reset link...</p>
          </>
        ) : error ? (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Invalid link</h1>
            <p style={{ fontSize: 13, color: '#E24B4A', marginBottom: 20 }}>{error}</p>
            <a href="/login" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 8, background: '#1D9E75', color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Back to sign in</a>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Set new password</h1>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Enter your new password below</p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 5 }}>New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 14, outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 5 }}>Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 14, outline: 'none' }}
              />
            </div>

            {error && <p style={{ fontSize: 12, color: '#E24B4A', marginBottom: 14 }}>{error}</p>}

            <button
              onClick={handleReset}
              disabled={loading || !password || !confirm}
              style={{ width: '100%', padding: '10px', borderRadius: 8, background: password && confirm ? '#1D9E75' : '#ccc', color: 'white', border: 'none', fontSize: 14, fontWeight: 500, cursor: password && confirm ? 'pointer' : 'not-allowed' }}
            >
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
