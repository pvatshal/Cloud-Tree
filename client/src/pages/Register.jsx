import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api/axios';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.post('/auth/register', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.panel}>
        <div style={s.panelInner}>
          <div style={s.treeIllustration}>🌱</div>
          <h1 style={s.panelTitle}>Start your family tree today.</h1>
          <p style={s.panelSub}>Join thousands of families preserving their history and celebrating each other.</p>
          <div style={s.features}>
            {[
              { icon: '🎂', text: 'Birthday & anniversary alerts' },
              { icon: '🔗', text: 'Connect all relationships' },
              { icon: '📸', text: 'Photos for every member' },
              { icon: '☁️',  text: 'Secure cloud storage' },
            ].map(f => (
              <div key={f.text} style={s.feature}>
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={s.formSide}>
        <div style={s.card} className="scale-in">
          <div style={s.logoRow}>
            <span style={s.logoIcon}>🌿</span>
            <span style={s.logoText}>CloudTree</span>
          </div>
          <h2 style={s.title}>Create your tree</h2>
          <p style={s.subtitle}>It's free and takes 30 seconds</p>

          {error && <div style={s.errorBox}>{error}</div>}

          <div style={s.fieldGroup}>
            <label style={s.label}>Full Name</label>
            <input style={s.input} placeholder="Jane Doe"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" placeholder="Min. 6 characters"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Creating...' : 'Create Account →'}
          </button>

          <p style={s.switchText}>
            Already have an account? <Link to="/login" style={s.link}>Sign in</Link>
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
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem',
  },
  panelInner: { color: 'white', maxWidth: '380px' },
  treeIllustration: { fontSize: '5rem', display: 'block', marginBottom: '1.5rem' },
  panelTitle: { fontFamily: 'Playfair Display, serif', fontSize: '2.2rem', lineHeight: 1.2, marginBottom: '1rem', fontWeight: 700 },
  panelSub: { fontSize: '1rem', opacity: 0.8, lineHeight: 1.6, marginBottom: '2rem' },
  features: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  feature: { display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.6rem 1rem', fontSize: '0.9rem', backdropFilter: 'blur(4px)' },
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
  input: { padding: '0.85rem 1rem', borderRadius: '12px', border: '2px solid #e8f5e0', fontSize: '0.95rem', outline: 'none', background: 'var(--sage-soft)', fontFamily: 'DM Sans, sans-serif' },
  btn: { width: '100%', padding: '0.95rem', background: 'linear-gradient(135deg, #16a34a, #166534)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem', marginBottom: '1.5rem', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 20px rgba(22,163,74,0.35)' },
  switchText: { textAlign: 'center', color: 'var(--text-soft)', fontSize: '0.9rem' },
  link: { color: 'var(--forest-light)', fontWeight: 600, textDecoration: 'none' },
};