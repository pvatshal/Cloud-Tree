import { useState, useRef } from 'react';
import API from '../api/axios';
import { useTheme } from '../context/ThemeContext';

export default function EditMemberModal({ member, onClose, onUpdated }) {
  const { dark } = useTheme();
  const [form, setForm] = useState({
    name: member.name || '',
    gender: member.gender || 'male',
    dob: member.dob ? member.dob.split('T')[0] : '',
    anniversary: member.anniversary ? member.anniversary.split('T')[0] : '',
    email: member.email || '',
    phone: member.phone || '',
    notes: member.notes || '',
    photo: member.photo || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(member.photo || '');
  const fileRef = useRef();

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const { data } = await API.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm(f => ({ ...f, photo: data.url }));
    } catch (err) {
      setError('Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

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

        {/* Photo Upload */}
        <div style={{ padding: '1rem 1.75rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            onClick={() => fileRef.current.click()}
            style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: preview ? 'transparent' : 'var(--sage)',
              border: '2px dashed var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
              transition: 'border 0.2s',
            }}
          >
            {preview
              ? <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '1.5rem' }}>📸</span>
            }
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-dark)' }}>Profile Photo</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: '0.4rem' }}>JPG, PNG up to 5MB</div>
            <button
              onClick={() => fileRef.current.click()}
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg-input)', cursor: 'pointer', color: 'var(--text-mid)', fontFamily: 'DM Sans, sans-serif' }}
            >
              {uploading ? '⏳ Uploading...' : '📁 Choose photo'}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
        </div>

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
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1rem' },
  modal: { background: 'var(--bg-modal)', borderRadius: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', fontFamily: 'DM Sans, sans-serif' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.75rem 1.75rem 0' },
  modalTitle: { fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', color: 'var(--forest)', fontWeight: 700 },
  modalSub: { color: 'var(--text-soft)', fontSize: '0.85rem', marginTop: '0.2rem' },
  closeBtn: { width: '32px', height: '32px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg-input)', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-soft)', flexShrink: 0 },
  errorBox: { margin: '1rem 1.75rem 0', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '0.75rem 1rem', color: '#dc2626', fontSize: '0.9rem' },
  section: { padding: '1.25rem 1.75rem' },
  row: { display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 },
  label: { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-mid)' },
  input: { padding: '0.7rem 0.85rem', borderRadius: '10px', border: '1.5px solid var(--border-input)', fontSize: '0.9rem', outline: 'none', background: 'var(--bg-input)', fontFamily: 'DM Sans, sans-serif', width: '100%', boxSizing: 'border-box', color: 'var(--text-dark)' },
  actions: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', padding: '1.25rem 1.75rem', borderTop: '1px solid var(--border)' },
  cancelBtn: { padding: '0.7rem 1.5rem', borderRadius: '10px', border: '1.5px solid var(--border)', cursor: 'pointer', background: 'var(--bg-modal)', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: 'var(--text-mid)' },
  submitBtn: { padding: '0.7rem 1.75rem', borderRadius: '10px', border: 'none', background: 'var(--btn-grad)', color: 'white', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--btn-shadow)' },
};