import { useState } from 'react'
import { useAuth } from '../auth'
import type { Role } from '../lib/types'
import { roleTitle } from '../lib/types'

export default function Auth({ role, onBack }: { role: Role; onBack: () => void }) {
  const a = useAuth()
  const [tab, setTab] = useState<'otp' | 'email'>(role === 'informal_collector' ? 'otp' : 'email')
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [entity, setEntity] = useState('')
  const [statutory, setStatutory] = useState('')

  const sendOtp = () => {
    if (phone.replace(/\D/g, '').length !== 10) return
    const code = a.requestDemoOtp(phone)
    setOtpSent(true)
    // Demo auto-fill after 2s, watcher below auto-submits
    setTimeout(() => setOtp((cur) => (cur.length !== 6 ? code : cur)), 2000)
  }

  const doVerify = async (code: string) => {
    if (code.length === 6) await a.verifyDemoOtp(code, phone, role)
  }

  return (
    <div className="page">
      <header className="topbar row"><button className="link" onClick={onBack}>← Back</button><div className="brand sm">{roleTitle(role)} Login</div></header>
      <div className="tabs">
        <button className={tab === 'otp' ? 'on' : ''} onClick={() => setTab('otp')}>📱 OTP</button>
        <button className={tab === 'email' ? 'on' : ''} onClick={() => setTab('email')}>✉️ Email</button>
      </div>
      {a.error && <div className="err">{a.error}</div>}
      {tab === 'otp' && (
        <div className="card">
          <h3>Mobile OTP Login</h3>
          {!otpSent ? (
            <>
              <input placeholder="10-digit mobile number" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
              <button className="btn" disabled={phone.length !== 10 || a.loading} onClick={sendOtp}>Generate OTP</button>
              {role !== 'government_admin' && <button className="link" onClick={() => { setTab('email'); setMode('up') }}>New here? Create an account</button>}
            </>
          ) : (
            <>
              <p className="muted">Demo OTP for +91 {phone} (auto-fills in 2s, no SMS sent)</p>
              <input placeholder="6-digit code" inputMode="numeric" value={otp} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setOtp(v); void doVerify(v) }} />
              <button className="btn" disabled={otp.length !== 6 || a.loading} onClick={() => doVerify(otp)}>{a.loading ? 'Verifying…' : 'Verify & Sign In'}</button>
              <button className="link" onClick={() => { setOtpSent(false); setOtp('') }}>Change number</button>
            </>
          )}
        </div>
      )}
      {tab === 'email' && (
        <div className="card">
          <h3>{mode === 'in' ? 'Email Sign In' : 'Create Account'}</h3>
          {mode === 'up' && (
            <>
              <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
              {role === 'formal_recycler' && (
                <>
                  <input placeholder="Facility / organisation name" value={entity} onChange={(e) => setEntity(e.target.value)} />
                  <input placeholder="CPCB authorisation number" value={statutory} onChange={(e) => setStatutory(e.target.value)} />
                </>
              )}
            </>
          )}
          <input placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Password (min 6 chars)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {mode === 'in' ? (
            <>
              <button className="btn" disabled={a.loading} onClick={() => a.signInEmail(email, password, role)}>{a.loading ? 'Signing in…' : 'Sign In'}</button>
              {role !== 'government_admin' && <button className="link" onClick={() => { setMode('up'); a.clearError() }}>New here? Create an account</button>}
            </>
          ) : (
            <>
              <button className="btn" disabled={a.loading} onClick={async () => {
                const ok = await a.signUp({ name, phone: '', email, password, role, entity, statutory })
                if (ok) { setMode('in'); setPassword('') }
              }}>{a.loading ? 'Creating…' : 'Create Account'}</button>
              <button className="link" onClick={() => { setMode('in'); a.clearError() }}>Already registered? Sign in</button>
            </>
          )}
          {role === 'government_admin' && <p className="muted">Admin accounts are provisioned centrally by CPCB — no self-registration.</p>}
        </div>
      )}
    </div>
  )
}
