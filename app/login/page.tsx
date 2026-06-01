'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
  setLoading(true)
  setError('')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    setError(error.message)
    setLoading(false)
  } else if (data.user) {
    window.location.href = '/dashboard'
  }
}

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f8' }}>
      <div style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '40px', width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 64, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src="/logo.svg" alt="AMflow" style={{ width: 64, height: 32, objectFit: 'contain' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Account Management Toolkit</span>
        </div>

        <p style={{ fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 20 }}>Improving Client Health & Operational Efficiency Using Data</p>
        <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Welcome back</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Sign in to your account</p>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 5 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 14, outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <label style={{ fontSize: 12, color: '#555' }}>Password</label>
            <a href="/forgot-password" style={{ fontSize: 12, color: '#1D9E75', textDecoration: 'none' }}>Forgot password?</a>
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 14, outline: 'none' }}
          />
        </div>

        {error && <p style={{ fontSize: 12, color: '#E24B4A', marginBottom: 14 }}>{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', padding: '10px', borderRadius: 8, background: '#1D9E75', color: 'white', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

<p style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 20 }}>
          No account?{' '}
          <a href="/signup" style={{ color: '#1D9E75', textDecoration: 'none' }}>Sign up</a>
        </p>

        <div style={{ marginTop: 28, paddingTop: 16, borderTop: '0.5px solid #e5e5e5', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#bbb', lineHeight: 1.6 }}>Created by Keenan Johannes</div>
          <div style={{ fontSize: 10, color: '#bbb' }}>keenanjohannes2@gmail.com</div>
          <div style={{ fontSize: 9, color: '#ccc', marginTop: 4 }}>For support or suggestions — reach out anytime</div>
        </div>
      </div>
    </div>
  )
}