import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import TreeCanvas from '../components/TreeCanvas';
import AddMemberModal from '../components/AddMemberModal';
import EditMemberModal from '../components/EditMemberModal';
import { useTheme } from '../context/ThemeContext';
import { toPng } from 'html-to-image';
import StatsPanel from './StatsPanel';


export default function Dashboard() {
  const [members, setMembers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState('all');
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'list'
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
const [showStats, setShowStats] = useState(false);



  const refetch = () => API.get('/members').then(res => setMembers(res.data));
  useEffect(() => { refetch().catch(() => navigate('/login')); }, []);

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };
  const handleDelete = async (id) => {
    if (!window.confirm('Remove this member from the tree?')) return;
    await API.delete(`/members/${id}`);
    refetch();
  };

  const handleExport = async () => {
  const el = document.querySelector('.react-flow');
  if (!el) return;
  try {
    const dataUrl = await toPng(el, { quality: 1, pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = 'cloudtree-family.png';
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Export failed:', err);
  }
};

  // Filtered members for list view
  const filtered = useMemo(() => members.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.phone?.includes(search);
    const matchGender = filterGender === 'all' || m.gender === filterGender;
    return matchSearch && matchGender;
  }), [members, search, filterGender]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', transition: 'background 0.3s ease' }}>

      {/* Navbar */}
      <nav style={{
        display: 'flex', alignItems: 'center', padding: '0 1.5rem',
        height: '64px', background: 'var(--bg-nav)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
        zIndex: 10, gap: '1rem', position: 'sticky', top: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🌿</span>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', color: 'var(--forest)', fontWeight: 700 }}>CloudTree</span>
        </div>

        {/* Search bar */}
        <div style={{ flex: 1, maxWidth: '360px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
          <input
            style={{
              width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem',
              borderRadius: '10px', border: '1.5px solid var(--border)',
              background: 'var(--bg-input)', fontSize: '0.88rem',
              color: 'var(--text-dark)', fontFamily: 'DM Sans, sans-serif',
              outline: 'none', transition: 'border 0.2s',
            }}
            placeholder="Search members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-soft)', fontSize: '0.9rem' }}
            >✕</button>
          )}
        </div>

        {/* Gender filter */}
        <select
          value={filterGender}
          onChange={e => setFilterGender(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem', borderRadius: '10px',
            border: '1.5px solid var(--border)', background: 'var(--bg-input)',
            fontSize: '0.85rem', color: 'var(--text-dark)',
            fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="all">👥 All</option>
          <option value="male">👨 Male</option>
          <option value="female">👩 Female</option>
          <option value="other">🧑 Other</option>
        </select>

        {/* View toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '10px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
          {[['tree', '🌳'], ['list', '📋']].map(([mode, icon]) => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{
              padding: '0.5rem 0.75rem', border: 'none', cursor: 'pointer',
              background: viewMode === mode ? 'var(--forest-light)' : 'transparent',
              color: viewMode === mode ? 'white' : 'var(--text-soft)',
              fontSize: '0.9rem', transition: 'background 0.2s',
              fontFamily: 'DM Sans, sans-serif',
            }}>{icon}</button>
          ))}
        </div>

        {/* Stats chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--sage-soft)', border: '1.5px solid var(--border)', borderRadius: '99px', padding: '0.3rem 0.9rem' }}>
          <span style={{ fontSize: '0.85rem' }}>👥</span>
          <span style={{ fontWeight: 700, color: 'var(--forest)', fontSize: '0.9rem' }}>
            {search || filterGender !== 'all' ? `${filtered.length}/` : ''}{members.length}
          </span>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: 'var(--sage-soft)', border: '1.5px solid var(--border)', borderRadius: '99px', padding: '0.25rem 0.75rem 0.25rem 0.25rem' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--btn-grad)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-mid)' }}>{user.name}</span>
          </div>

          <button onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'}
            style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'rotate(20deg) scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >{dark ? '☀️' : '🌙'}</button>

<button
  onClick={() => setShowStats(true)}
  style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-soft)' }}
  title="Family Stats"
>📊</button>

{/* Export button */}
{viewMode === 'tree' && members.length > 0 && (
  <button
    onClick={handleExport}
    style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-soft)' }}
    title="Export as PNG"
  >🖼️</button>
)}





          <button className="btn-primary" onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1.1rem', background: 'var(--btn-grad)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: 'var(--btn-shadow)' }}>
            <span style={{ fontSize: '1rem' }}>+</span> Add Member
          </button>

          <button onClick={handleLogout}
            style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-soft)' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >⎋</button>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {members.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', textAlign: 'center' }} className="fade-up">
            <div style={{ fontSize: '5.5rem' }}>🌱</div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', color: 'var(--forest)', fontWeight: 700 }}>Your family tree awaits</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '1rem', maxWidth: '320px', lineHeight: 1.6 }}>Add your first family member to begin</p>
            <button className="btn-primary" onClick={() => setShowAddModal(true)}
              style={{ padding: '0.9rem 2.2rem', background: 'var(--btn-grad)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: 'var(--btn-shadow)', marginTop: '0.5rem' }}>
              + Add First Member
            </button>
          </div>
        ) : viewMode === 'tree' ? (
          <TreeCanvas
            members={search || filterGender !== 'all' ? filtered : members}
            onEdit={setEditMember}
            onDelete={handleDelete}
          />
        ) : (
          <ListView
            members={filtered}
            onEdit={setEditMember}
            onDelete={handleDelete}
          />
        )}
      </div>

      {showAddModal && <AddMemberModal members={members} onClose={() => setShowAddModal(false)} onAdded={refetch} />}
      {editMember && <EditMemberModal member={editMember} onClose={() => setEditMember(null)} onUpdated={refetch} />}
    
    {showStats && <StatsPanel members={members} onClose={() => setShowStats(false)} />}

    </div>
  );
}

// ── List View Component ───────────────────────────────────────────────────────
function ListView({ members, onEdit, onDelete }) {
  const GENDER_COLORS = {
    male:   { bg: '#eff6ff', border: '#93c5fd', badge: '#3b82f6' },
    female: { bg: '#fdf2f8', border: '#f9a8d4', badge: '#ec4899' },
    other:  { bg: '#f5f3ff', border: '#c4b5fd', badge: '#8b5cf6' },
  };

  function getInitials(name) {
    return name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  }

  if (!members.length) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-soft)', gap: '0.5rem' }}>
      <div style={{ fontSize: '3rem' }}>🔍</div>
      <p style={{ fontSize: '1.1rem' }}>No members match your search</p>
    </div>
  );

  return (
    <div style={{ padding: '1.5rem', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
        {members.map((m, i) => {
          const cfg = GENDER_COLORS[m.gender] || GENDER_COLORS.other;
          return (
            <div key={m._id} className="fade-up" style={{
              background: 'var(--bg-card)', borderRadius: '16px',
              border: `1.5px solid ${cfg.border}`,
              padding: '1.25rem', display: 'flex', gap: '1rem',
              alignItems: 'center', boxShadow: 'var(--shadow-card)',
              animationDelay: `${i * 0.05}s`,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
            >
              {/* Avatar */}
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: m.photo ? 'transparent' : `linear-gradient(135deg, ${cfg.badge}cc, ${cfg.badge})`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1rem', overflow: 'hidden', boxShadow: `0 4px 12px ${cfg.badge}44` }}>
                {m.photo
                  ? <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : getInitials(m.name)
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text-dark)', marginBottom: '0.2rem' }}>{m.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {m.dob && <span>🎂 {new Date(m.dob).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  {m.phone && <span>📞 {m.phone}</span>}
                  {m.email && <span>📧 {m.email}</span>}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <button onClick={() => onEdit(m)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dbeafe', border: 'none', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                <button onClick={() => onDelete(m._id)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fee2e2', border: 'none', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}