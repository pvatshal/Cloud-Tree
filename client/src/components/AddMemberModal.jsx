import { useState } from 'react';
import API from '../api/axios';
import { useTheme } from '../context/ThemeContext';

const RELATION_TYPES = [
  { value: 'child_of',  label: '👶 Is child of' },
  { value: 'parent_of', label: '👴 Is parent of' },
  { value: 'spouse_of', label: '💍 Is spouse of' },
];

export default function AddMemberModal({ onClose, onAdded, members }) {

    const { dark } = useTheme();

  const [form, setForm] = useState({ name: '', gender: 'male', dob: '', anniversary: '', email: '', phone: '', notes: '' });
  const [relationships, setRelationships] = useState([{ type: 'none', memberId: '' }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addRel = () => setRelationships(p => [...p, { type: 'none', memberId: '' }]);
  const removeRel = i => setRelationships(p => p.filter((_, idx) => idx !== i));
  const updateRel = (i, field, val) => setRelationships(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const applyRelationship = async (newId, rel) => {
    if (rel.type === 'none' || !rel.memberId) return;
    if (rel.type === 'child_of') {
      await API.put(`/members/${rel.memberId}`, { $push_child: newId });
      await API.put(`/members/${newId}`, { $push_parent: rel.memberId });
    } else if (rel.type === 'parent_of') {
      await API.put(`/members/${newId}`, { $push_child: rel.memberId });
      await API.put(`/members/${rel.memberId}`, { $push_parent: newId });
    } else if (rel.type === 'spouse_of') {
      await API.put(`/members/${newId}`, { spouse: rel.memberId });
      await API.put(`/members/${rel.memberId}`, { spouse: newId });
    }
  };

  const handleSubmit = async () => {
    if (!form.name) return setError('Name is required');
    for (const rel of relationships) {
      if (rel.type !== 'none' && !rel.memberId) return setError('Please select a member for each relationship');
    }
    setLoading(true);
    try {
      const { data: newMember } = await API.post('/members', form);
      for (const rel of relationships) await applyRelationship(newMember._id, rel);
      onAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal} className="scale-in">
        <div style={s.modalHeader}>
          <div>
            <h2 style={s.modalTitle}>Add Family Member</h2>
            <p style={s.modalSub}>Fill in the details below</p>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        {/* Personal Info */}
        <div style={s.section}>
          <div style={s.sectionLabel}>👤 Personal Info</div>
          <div style={s.row}>
            <div style={{ ...s.field, flex: 2 }}>
              <label style={s.label}>Full Name *</label>
              <input style={s.input} placeholder="e.g. John Patel"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
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
              <input style={s.input} type="email" placeholder="for birthday alerts"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>📞 Phone</label>
              <input style={s.input} placeholder="optional"
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Relationships */}
        {members.length > 0 && (
          <div style={s.section}>
            <div style={s.relHeader}>
              <span style={s.sectionLabel}>🔗 Relationships</span>
              <button style={s.addRelBtn} onClick={addRel}>+ Add more</button>
            </div>

            {relationships.map((rel, i) => (
              <div key={i} style={s.relRow}>
                <select style={{ ...s.input, flex: 1 }} value={rel.type}
                  onChange={e => updateRel(i, 'type', e.target.value)}>
                  <option value="none">No relation</option>
                  {RELATION_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {rel.type !== 'none' && (
                  <select style={{ ...s.input, flex: 1 }} value={rel.memberId}
                    onChange={e => updateRel(i, 'memberId', e.target.value)}>
                    <option value="">-- Select member --</option>
                    {members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                )}
                {relationships.length > 1 && (
                  <button style={s.removeBtn} onClick={() => removeRel(i)}>✕</button>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={s.actions}>
          <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Adding...' : '✓ Add Member'}
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
}, modal: {
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
  section: { padding: '1.25rem 1.75rem', borderBottom: '1px solid #f0fdf4' },
  sectionLabel: { fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'block' },
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
},  relHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  addRelBtn: { fontSize: '0.8rem', background: 'var(--sage)', color: 'var(--forest)', border: 'none', borderRadius: '8px', padding: '0.3rem 0.8rem', cursor: 'pointer', fontWeight: 600 },
  relRow: { display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' },
  removeBtn: { width: '30px', height: '30px', background: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#dc2626', fontWeight: 700, flexShrink: 0 },
  actions: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', padding: '1.25rem 1.75rem' },
  cancelBtn: { padding: '0.7rem 1.5rem', borderRadius: '10px', border: '1.5px solid #e8f5e0', cursor: 'pointer', background: 'white', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: 'var(--text-mid)' },
  submitBtn: { padding: '0.7rem 1.75rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #16a34a, #166534)', color: 'white', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' },

};