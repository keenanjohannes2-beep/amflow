'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReset = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://amflow-ten.vercel.app/reset-password',
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f8' }}>
        <div style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '40px', width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: '#E8F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Check your email</h1>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>We sent a password reset link to:</p>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 20 }}>{email}</p>
          <p style={{ fontSize: 12, color: '#aaa' }}>Didn't receive it?{' '}
            <a href="/forgot-password" style={{ color: '#1D9E75', textDecoration: 'none' }}>Try again</a>
          </p>
          <a href="/login" style={{ display: 'inline-block', marginTop: 20, fontSize: 13, color: '#1D9E75', textDecoration: 'none' }}>Back to sign in</a>
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

        <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Reset your password</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Enter your email and we'll send you a reset link</p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 5 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 14, outline: 'none' }}
          />
        </div>

        {error && <p style={{ fontSize: 12, color: '#E24B4A', marginBottom: 14 }}>{error}</p>}

        <button
          onClick={handleReset}
          disabled={loading || !email}
          style={{ width: '100%', padding: '10px', borderRadius: 8, background: email ? '#1D9E75' : '#ccc', color: 'white', border: 'none', fontSize: 14, fontWeight: 500, cursor: email ? 'pointer' : 'not-allowed' }}
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>

        <p style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 20 }}>
          <a href="/login" style={{ color: '#1D9E75', textDecoration: 'none' }}>Back to sign in</a>
        </p>

        <div style={{ marginTop: 28, paddingTop: 16, borderTop: '0.5px solid #e5e5e5', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#bbb', lineHeight: 1.6 }}>Created by Keenan Johannes</div>
          <div style={{ fontSize: 10, color: '#bbb' }}>keenanjohannes2@gmail.com</div>
        </div>
      </div>
    </div>
  )
}
