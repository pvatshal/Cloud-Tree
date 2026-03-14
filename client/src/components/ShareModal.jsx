import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useTheme } from '../context/ThemeContext';

export default function ShareModal({ onClose }) {
  const { dark } = useTheme();
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);
  const [revoking, setRevoking] = useState(false);

  const link = token
    ? `${window.location.origin}/shared/${token}`
    : null;

  useEffect(() => {
    API.get('/share/my')
      .then(r => setToken(r.data.token))
      .finally(() => setLoading(false));
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      const r = await API.post('/share');
      setToken(r.data.token);
    } finally {
      setLoading(false);
    }
  };

  const revoke = async () => {
    setRevoking(true);
    try {
      await API.delete('/share');
      setToken(null);
    } finally {
      setRevoking(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, background: dark ? 'var(--bg-card)' : '#fff' }} className="scale-in">

        {/* Header */}
        <div style={s.header}>
          <div>
            <h2 style={s.title}>🌐 Share Your Tree</h2>
            <p style={s.sub}>Anyone with the link can view — no login needed</p>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.body}>
          {loading ? (
            <div style={s.center}>⏳ Loading...</div>
          ) : token ? (
            <>
              {/* Active link */}
              <div style={s.linkBox}>
                <span style={s.linkText}>{link}</span>
                <button style={{ ...s.copyBtn, background: copied ? '#16a34a' : '#1a4731' }} onClick={copy}>
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>

              <div style={s.infoRow}>
                <span style={s.badge}>🟢 Link is active</span>
              </div>

              {/* QR hint */}
              <p style={s.hint}>
                Share this link with family members. They can view the tree on any device.
              </p>

              {/* Revoke */}
              <button
                style={{ ...s.revokeBtn, opacity: revoking ? 0.6 : 1 }}
                onClick={revoke}
                disabled={revoking}
              >
                {revoking ? '⏳ Revoking...' : '🗑 Revoke Link'}
              </button>
            </>
          ) : (
            <>
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>🔗</div>
                <p style={s.emptyText}>No active share link yet.</p>
                <p style={s.emptyHint}>Generate a link to share your family tree with others.</p>
              </div>
              <button style={s.generateBtn} onClick={generate}>
                ✨ Generate Share Link
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(6px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 200, padding: '1rem',
  },
  modal: {
    borderRadius: '20px', width: '100%', maxWidth: '480px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
    border: '1px solid var(--border)',
    fontFamily: 'DM Sans, sans-serif', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '1.5rem 1.5rem 0',
  },
  title: {
    fontFamily: 'Playfair Display, serif',
    fontSize: '1.4rem', color: 'var(--forest)', fontWeight: 700, margin: 0,
  },
  sub: { color: 'var(--text-soft)', fontSize: '0.85rem', marginTop: '0.25rem' },
  closeBtn: {
    width: '32px', height: '32px', borderRadius: '8px',
    border: '1.5px solid var(--border)', background: 'var(--sage-soft)',
    cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-soft)', flexShrink: 0,
  },
  body: { padding: '1.5rem' },
  center: { textAlign: 'center', padding: '2rem', color: 'var(--text-soft)' },
  linkBox: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    background: 'var(--sage-soft)', borderRadius: '12px',
    padding: '0.75rem 1rem', border: '1.5px solid var(--border)',
  },
  linkText: {
    flex: 1, fontSize: '0.8rem', color: 'var(--text-mid)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    fontFamily: 'monospace',
  },
  copyBtn: {
    padding: '0.45rem 1rem', borderRadius: '8px', border: 'none',
    color: 'white', fontSize: '0.85rem', fontWeight: 600,
    cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
    fontFamily: 'DM Sans, sans-serif',
  },
  infoRow: { display: 'flex', alignItems: 'center', marginTop: '0.75rem' },
  badge: {
    fontSize: '0.8rem', color: '#16a34a', fontWeight: 600,
    background: '#f0fdf4', padding: '0.3rem 0.75rem',
    borderRadius: '20px', border: '1px solid #bbf7d0',
  },
  hint: {
    fontSize: '0.85rem', color: 'var(--text-soft)',
    marginTop: '1rem', lineHeight: 1.6,
  },
  revokeBtn: {
    marginTop: '1rem', width: '100%', padding: '0.7rem',
    background: '#fee2e2', border: '1px solid #fecaca',
    borderRadius: '10px', color: '#dc2626', fontSize: '0.9rem',
    fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
  },
  emptyState: { textAlign: 'center', padding: '1rem 0 1.5rem' },
  emptyIcon: { fontSize: '2.5rem', marginBottom: '0.5rem' },
  emptyText: { fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', margin: 0 },
  emptyHint: { fontSize: '0.85rem', color: 'var(--text-soft)', marginTop: '0.5rem' },
  generateBtn: {
    width: '100%', padding: '0.85rem',
    background: 'linear-gradient(135deg, #16a34a, #166534)',
    border: 'none', borderRadius: '12px', color: 'white',
    fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
    boxShadow: '0 4px 16px rgba(22,163,74,0.3)',
  },
};