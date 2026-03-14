import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useTheme } from '../context/ThemeContext';

export default function InviteModal({ onClose }) {
  const { dark } = useTheme();
  const [email,        setEmail]        = useState('');
  const [role,         setRole]         = useState('viewer');
  const [sending,      setSending]      = useState(false);
  const [invites,      setInvites]      = useState([]);
  const [collabs,      setCollabs]      = useState([]);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');

  const load = async () => {
    const [iv, co] = await Promise.all([
      API.get('/invites/my'),
      API.get('/collaborators'),
    ]);
    setInvites(iv.data);
    setCollabs(co.data);
  };

  useEffect(() => { load(); }, []);

  const sendInvite = async () => {
    if (!email) return setError('Enter an email address');
    setError(''); setSending(true);
    try {
      await API.post('/invites', { email, role });
      setSuccess(`Invite sent to ${email}!`);
      setEmail('');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  const revokeInvite = async (id) => {
    await API.delete(`/invites/${id}`);
    load();
  };

  const removeCollab = async (userId) => {
    if (!window.confirm('Remove this collaborator?')) return;
    await API.delete(`/collaborators/${userId}`);
    load();
  };

  const roleLabel = r => r === 'editor' ? '✏️ Editor' : '👁 Viewer';
  const roleBadgeStyle = r => ({
    fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem',
    borderRadius: '20px',
    background: r === 'editor' ? '#dbeafe' : '#f0fdf4',
    color:      r === 'editor' ? '#1d4ed8' : '#16a34a',
    border: `1px solid ${r === 'editor' ? '#93c5fd' : '#86efac'}`,
  });

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, background: dark ? 'var(--bg-card)' : '#fff' }} className="scale-in">

        {/* Header */}
        <div style={s.header}>
          <div>
            <h2 style={s.title}>👥 Collaborate</h2>
            <p style={s.sub}>Invite family members to your tree</p>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.body}>
          {/* Send invite form */}
          <div style={s.section}>
            <div style={s.sectionLabel}>✉️ Send Invite</div>
            {error   && <div style={s.errorBox}>{error}</div>}
            {success && <div style={s.successBox}>{success}</div>}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                style={{ ...s.input, flex: 2, minWidth: '180px' }}
                type="email" placeholder="family@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendInvite()}
              />
              <select style={{ ...s.input, flex: 1, minWidth: '120px' }}
                value={role} onChange={e => setRole(e.target.value)}>
                <option value="viewer">👁 Viewer</option>
                <option value="editor">✏️ Editor</option>
              </select>
              <button
                style={{ ...s.sendBtn, opacity: sending ? 0.7 : 1 }}
                onClick={sendInvite} disabled={sending}
              >
                {sending ? '⏳' : '📨 Send'}
              </button>
            </div>
            <div style={s.roleHint}>
              <span>👁 <strong>Viewer</strong> — can only view the tree</span>
              <span style={{ marginLeft: '1rem' }}>✏️ <strong>Editor</strong> — can add & edit members</span>
            </div>
          </div>

          {/* Active collaborators */}
          {collabs.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionLabel}>✅ Active Collaborators</div>
              {collabs.map(c => (
                <div key={c._id} style={s.row}>
                  <div style={s.avatar}>{c.userId.name?.[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={s.name}>{c.userId.name}</div>
                    <div style={s.email}>{c.userId.email}</div>
                  </div>
                  <span style={roleBadgeStyle(c.role)}>{roleLabel(c.role)}</span>
                  <button style={s.removeBtn} onClick={() => removeCollab(c.userId._id)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Pending invites */}
          {invites.filter(i => i.status === 'pending').length > 0 && (
            <div style={s.section}>
              <div style={s.sectionLabel}>⏳ Pending Invites</div>
              {invites.filter(i => i.status === 'pending').map(inv => (
                <div key={inv._id} style={s.row}>
                  <div style={{ ...s.avatar, background: '#fef3c7', color: '#d97706' }}>✉️</div>
                  <div style={{ flex: 1 }}>
                    <div style={s.name}>{inv.inviteeEmail}</div>
                    <div style={s.email}>Invite sent {new Date(inv.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span style={roleBadgeStyle(inv.role)}>{roleLabel(inv.role)}</span>
                  <button style={s.removeBtn} onClick={() => revokeInvite(inv._id)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {collabs.length === 0 && invites.filter(i => i.status === 'pending').length === 0 && (
            <div style={s.empty}>
              <div style={{ fontSize: '2.5rem' }}>👨‍👩‍👧‍👦</div>
              <p>No collaborators yet. Invite family members above!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200, padding: '1rem' },
  modal: { borderRadius: '20px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid var(--border)', fontFamily: 'DM Sans, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.5rem 1.5rem 0' },
  title: { fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', color: 'var(--forest)', fontWeight: 700, margin: 0 },
  sub: { color: 'var(--text-soft)', fontSize: '0.85rem', marginTop: '0.25rem' },
  closeBtn: { width: '32px', height: '32px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--sage-soft)', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-soft)', flexShrink: 0 },
  body: { padding: '1.25rem 1.5rem 1.5rem' },
  section: { marginBottom: '1.5rem' },
  sectionLabel: { fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' },
  input: { padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1.5px solid var(--border-input)', fontSize: '0.9rem', background: 'var(--bg-input)', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-dark)', outline: 'none', boxSizing: 'border-box' },
  sendBtn: { padding: '0.65rem 1.2rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #16a34a, #166534)', color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', whiteSpace: 'nowrap' },
  roleHint: { fontSize: '0.78rem', color: 'var(--text-soft)', marginTop: '0.5rem' },
  row: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '0.5rem', background: 'var(--sage-soft)' },
  avatar: { width: '34px', height: '34px', borderRadius: '50%', background: 'var(--forest-light)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 },
  name: { fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-dark)' },
  email: { fontSize: '0.78rem', color: 'var(--text-soft)' },
  removeBtn: { width: '28px', height: '28px', borderRadius: '6px', background: '#fee2e2', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700, flexShrink: 0 },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.6rem 0.85rem', color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.75rem' },
  successBox: { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '0.6rem 0.85rem', color: '#16a34a', fontSize: '0.85rem', marginBottom: '0.75rem' },
  empty: { textAlign: 'center', padding: '2rem', color: 'var(--text-soft)', fontSize: '0.9rem' },
};