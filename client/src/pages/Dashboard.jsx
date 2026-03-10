import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import TreeCanvas from '../components/TreeCanvas';
import AddMemberModal from '../components/AddMemberModal';
import EditMemberModal from '../components/EditMemberModal';
import { useTheme } from '../context/ThemeContext';

export default function Dashboard() {
  const [members, setMembers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const refetch = () => API.get('/members').then(res => setMembers(res.data));

  useEffect(() => { refetch().catch(() => navigate('/login')); }, []);

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };
  const handleDelete = async (id) => {
    if (!window.confirm('Remove this member from the tree?')) return;
    await API.delete(`/members/${id}`);
    refetch();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', transition: 'background 0.3s ease' }}>

      {/* Navbar — glassmorphism */}
      <nav style={{
        display: 'flex', alignItems: 'center',
        padding: '0 1.5rem', height: '64px',
        background: 'var(--bg-nav)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        zIndex: 10, gap: '1rem',
        position: 'sticky', top: 0,
        transition: 'background 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <span style={{ fontSize: '1.4rem', animation: 'pulse 4s ease infinite' }}>🌿</span>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', color: 'var(--forest)', fontWeight: 700, letterSpacing: '-0.01em' }}>
            CloudTree
          </span>
        </div>

        {/* Center stats */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          background: 'var(--sage-soft)', border: '1.5px solid var(--border)',
          borderRadius: '99px', padding: '0.3rem 0.9rem',
        }}>
          <span style={{ fontSize: '0.85rem' }}>👥</span>
          <span style={{ fontWeight: 700, color: 'var(--forest)', fontSize: '0.9rem' }}>{members.length}</span>
          <span style={{ color: 'var(--text-soft)', fontSize: '0.82rem' }}>members</span>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, justifyContent: 'flex-end' }}>

          {/* User chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: 'var(--sage-soft)', border: '1.5px solid var(--border)', borderRadius: '99px', padding: '0.25rem 0.75rem 0.25rem 0.25rem' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--btn-grad)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-mid)' }}>{user.name}</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: '36px', height: '36px', borderRadius: '10px',
              border: '1.5px solid var(--border)',
              background: 'var(--bg-card)',
              cursor: 'pointer', fontSize: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.2s, background 0.3s',
              color: 'var(--text-mid)',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'rotate(20deg) scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            {dark ? '☀️' : '🌙'}
          </button>

          {/* Add Member */}
          <button
            className="btn-primary"
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.5rem 1.1rem',
              background: 'var(--btn-grad)',
              color: 'white', border: 'none',
              borderRadius: '10px', fontSize: '0.88rem',
              fontWeight: 600, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              boxShadow: 'var(--btn-shadow)',
              letterSpacing: '0.01em',
            }}
          >
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
            Add Member
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              width: '36px', height: '36px', borderRadius: '10px',
              border: '1.5px solid var(--border)',
              background: 'var(--bg-card)',
              cursor: 'pointer', fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-soft)', transition: 'color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >⎋</button>
        </div>
      </nav>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        {members.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', textAlign: 'center' }} className="fade-up">
            <div style={{ fontSize: '5.5rem', filter: 'drop-shadow(0 12px 32px rgba(34,197,94,0.3))', animation: 'pulse 3s ease infinite' }}>🌱</div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', color: 'var(--forest)', fontWeight: 700 }}>Your family tree awaits</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '1rem', maxWidth: '320px', lineHeight: 1.6 }}>
              Add your first family member to begin building your tree
            </p>
            <button
              className="btn-primary"
              onClick={() => setShowAddModal(true)}
              style={{ padding: '0.9rem 2.2rem', background: 'var(--btn-grad)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: 'var(--btn-shadow)', marginTop: '0.5rem' }}
            >
              + Add First Member
            </button>
          </div>
        ) : (
          <TreeCanvas members={members} onEdit={setEditMember} onDelete={handleDelete} />
        )}
      </div>

      {showAddModal && (
        <AddMemberModal members={members} onClose={() => setShowAddModal(false)} onAdded={refetch} />
      )}
      {editMember && (
        <EditMemberModal member={editMember} onClose={() => setEditMember(null)} onUpdated={refetch} />
      )}
    </div>
  );
}