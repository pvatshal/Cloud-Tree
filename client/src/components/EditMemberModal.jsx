import { useState } from 'react';
import API from '../api/axios';
import { useTheme } from '../context/ThemeContext';

export default function EditMemberModal({ member, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: member.name || '',
    gender: member.gender || 'male',
    dob: member.dob ? member.dob.split('T')[0] : '',
    anniversary: member.anniversary ? member.anniversary.split('T')[0] : '',
    email: member.email || '',
    phone: member.phone || '',
    notes: member.notes || '',
  });
      const { dark } = useTheme();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name) return setError('Name is required');
    setLoading(true);
    try {
      await API.put(`/members/${member._id}`, form);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal} className="scale-in">
        <div style={s.modalHeader}>
          <div>
            <h2 style={s.modalTitle}>Edit Member</h2>
            <p style={s.modalSub}>Update {member.name}'s details</p>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        <div style={s.section}>
          <div style={s.row}>
            <div style={{ ...s.field, flex: 2 }}>
              <label style={s.label}>Full Name *</label>
              <input style={s.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Gender</label>
              <select style={s.input} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="male">👨 Male</option>
                <option value="female">👩 Female</option>
                <option value="other">🧑 Other</option>
              </select>
            </div>
          </div>

          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>🎂 Date of Birth</label>
              <input style={s.input} type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>💍 Anniversary</label>
              <input style={s.input} type="date" value={form.anniversary} onChange={e => setForm({ ...form, anniversary: e.target.value })} />
            </div>
          </div>

          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>📧 Email</label>
              <input style={s.input} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>📞 Phone</label>
              <input style={s.input} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>📝 Notes</label>
            <textarea style={{ ...s.input, height: '70px', resize: 'vertical' }}
              value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <div style={s.actions}>
          <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Saving...' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
overlay: {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.45)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  display: 'flex', justifyContent: 'center',
  alignItems: 'center', zIndex: 100, padding: '1rem'
},
modal: {
  background: 'var(--bg-modal)',
  borderRadius: '24px', width: '100%',
  maxWidth: '520px', maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: 'var(--shadow-lg)',
  border: '1px solid var(--border)',
  fontFamily: 'DM Sans, sans-serif'
},
modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.75rem 1.75rem 0' },
  modalTitle: { fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', color: 'var(--forest)', fontWeight: 700 },
  modalSub: { color: 'var(--text-soft)', fontSize: '0.85rem', marginTop: '0.2rem' },
  closeBtn: { width: '32px', height: '32px', borderRadius: '8px', border: '1.5px solid #e8f5e0', background: 'var(--sage-soft)', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-soft)', flexShrink: 0 },
  errorBox: { margin: '1rem 1.75rem 0', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '0.75rem 1rem', color: '#dc2626', fontSize: '0.9rem' },
  section: { padding: '1.25rem 1.75rem' },
  row: { display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 },
  label: { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-mid)' },
  input: {
  padding: '0.7rem 0.85rem', borderRadius: '10px',
  border: '1.5px solid var(--border-input)',
  fontSize: '0.9rem', outline: 'none',
  background: 'var(--bg-input)',
  fontFamily: 'DM Sans, sans-serif',
  width: '100%', boxSizing: 'border-box',
  color: 'var(--text-dark)',
  transition: 'border 0.2s',
}, actions: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', padding: '1.25rem 1.75rem', borderTop: '1px solid #f0fdf4' },
  cancelBtn: { padding: '0.7rem 1.5rem', borderRadius: '10px', border: '1.5px solid #e8f5e0', cursor: 'pointer', background: 'white', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: 'var(--text-mid)' },
  submitBtn: { padding: '0.7rem 1.75rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #16a34a, #166534)', color: 'white', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' },
};