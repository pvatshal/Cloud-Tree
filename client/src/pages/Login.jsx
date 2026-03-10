import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api/axios';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.post('/auth/login', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {/* Left decorative panel */}
      <div style={s.panel}>
        <div style={s.panelInner}>
          <div style={s.treeIllustration}>🌳</div>
          <h1 style={s.panelTitle}>Your family story,<br/>beautifully preserved.</h1>
          <p style={s.panelSub}>Map generations, celebrate milestones, and keep everyone connected.</p>
          <div style={s.dots}>
            {['Birthdays', 'Anniversaries', 'Relationships', 'Memories'].map(t => (
              <span key={t} style={s.dot}>✦ {t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={s.formSide}>
        <div style={s.card} className="scale-in">
          <div style={s.logoRow}>
            <span style={s.logoIcon}>🌿</span>
            <span style={s.logoText}>CloudTree</span>
          </div>
          <h2 style={s.title}>Welcome back</h2>
          <p style={s.subtitle}>Sign in to your family tree</p>

          {error && <div style={s.errorBox}>{error}</div>}

          <div style={s.fieldGroup}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" placeholder="••••••••"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Signing in...' : 'Sign In →'}
          </button>

          <p style={s.switchText}>
            New to CloudTree? <Link to="/register" style={s.link}>Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' },
  panel: {
    width: '45%', background: 'linear-gradient(160deg, #1a4731 0%, #166534 50%, #15803d 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '3rem', position: 'relative', overflow: 'hidden',
  },
  panelInner: { position: 'relative', zIndex: 1, color: 'white', maxWidth: '380px' },
  treeIllustration: { fontSize: '5rem', display: 'block', marginBottom: '1.5rem', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))' },
  panelTitle: { fontFamily: 'Playfair Display, serif', fontSize: '2.2rem', lineHeight: 1.2, marginBottom: '1rem', fontWeight: 700 },
  panelSub: { fontSize: '1rem', opacity: 0.8, lineHeight: 1.6, marginBottom: '2rem' },
  dots: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
  dot: { background: 'rgba(255,255,255,0.15)', borderRadius: '99px', padding: '0.3rem 0.8rem', fontSize: '0.8rem', backdropFilter: 'blur(4px)' },

  formSide: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', padding: '2rem' },
  card: { width: '100%', maxWidth: '400px', background: 'white', borderRadius: '24px', padding: '2.5rem', boxShadow: '0 20px 60px rgba(26,71,49,0.12)' },
  logoRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' },
  logoIcon: { fontSize: '1.5rem' },
  logoText: { fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', color: 'var(--forest)', fontWeight: 700 },
  title: { fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', color: 'var(--text-dark)', marginBottom: '0.3rem' },
  subtitle: { color: 'var(--text-soft)', fontSize: '0.95rem', marginBottom: '1.8rem' },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '0.75rem 1rem', color: '#dc2626', fontSize: '0.9rem', marginBottom: '1rem' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' },
  label: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-mid)' },
  input: {
    padding: '0.85rem 1rem', borderRadius: '12px', border: '2px solid #e8f5e0',
    fontSize: '0.95rem', outline: 'none', transition: 'border 0.2s',
    background: 'var(--sage-soft)', fontFamily: 'DM Sans, sans-serif',
  },
  btn: {
    width: '100%', padding: '0.95rem', background: 'linear-gradient(135deg, #16a34a, #166534)',
    color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem',
    fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem', marginBottom: '1.5rem',
    fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.01em',
    boxShadow: '0 4px 20px rgba(22,163,74,0.35)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  switchText: { textAlign: 'center', color: 'var(--text-soft)', fontSize: '0.9rem' },
  link: { color: 'var(--forest-light)', fontWeight: 600, textDecoration: 'none' },
};