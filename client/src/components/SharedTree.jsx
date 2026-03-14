import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import TreeCanvas from '../components/TreeCanvas';
import { useTheme } from '../context/ThemeContext';

export default function SharedTree() {
  const { token } = useParams();
  const { dark, toggleTheme } = useTheme();
  const [members,   setMembers]   = useState([]);
  const [ownerName, setOwnerName] = useState('');
  const [status,    setStatus]    = useState('loading'); // loading | ok | error

  useEffect(() => {
    axios.get(`/api/public/${token}`)
      .then(r => {
        setMembers(r.data.members);
        setOwnerName(r.data.ownerName);
        setStatus('ok');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  if (status === 'loading') return (
    <div style={s.center}>
      <div style={s.spinner}>🌳</div>
      <p style={s.msg}>Loading family tree...</p>
    </div>
  );

  if (status === 'error') return (
    <div style={s.center}>
      <div style={{ fontSize: '3rem' }}>🔗</div>
      <p style={{ ...s.msg, color: '#dc2626' }}>This link is invalid or has been revoked.</p>
    </div>
  );

  return (
    <div style={{ background: dark ? 'var(--bg)' : '#f0fdf4', minHeight: '100vh' }}>
      {/* Read-only banner */}
      <div style={{ ...s.banner, background: dark ? '#132117' : '#1a4731' }}>
        <span style={s.bannerLeft}>
          🌳 <strong>{ownerName}'s</strong> Family Tree
        </span>
        <span style={s.bannerBadge}>👁 Read-only view</span>
        <button style={s.themeBtn} onClick={toggleTheme}>
          {dark ? '☀️' : '🌙'}
        </button>
      </div>

      {members.length === 0 ? (
        <div style={s.center}>
          <p style={s.msg}>This family tree is empty.</p>
        </div>
      ) : (
        // Pass null for onEdit/onDelete so MemberCard hides those buttons
        <TreeCanvas members={members} onEdit={null} onDelete={null} />
      )}
    </div>
  );
}

const s = {
  center: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    height: '100vh', fontFamily: 'DM Sans, sans-serif',
    gap: '0.75rem',
  },
  spinner: { fontSize: '3rem', animation: 'pulse 1.5s infinite' },
  msg: { fontSize: '1.1rem', color: 'var(--text-soft)', margin: 0 },
  banner: {
    height: '52px', display: 'flex', alignItems: 'center',
    padding: '0 1.5rem', gap: '1rem',
    fontFamily: 'DM Sans, sans-serif', position: 'sticky', top: 0, zIndex: 50,
  },
  bannerLeft: {
    color: 'white', fontSize: '0.95rem', flex: 1,
  },
  bannerBadge: {
    background: 'rgba(255,255,255,0.15)', color: 'white',
    fontSize: '0.8rem', fontWeight: 600,
    padding: '0.3rem 0.8rem', borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  themeBtn: {
    background: 'transparent', border: 'none',
    fontSize: '1.1rem', cursor: 'pointer',
  },
};