import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function StatsPanel({ members, onClose }) {
  const { dark } = useTheme();

  const stats = useMemo(() => {
    const total = members.length;
    const male = members.filter(m => m.gender === 'male').length;
    const female = members.filter(m => m.gender === 'female').length;
    const other = members.filter(m => m.gender === 'other').length;
    const withEmail = members.filter(m => m.email).length;
    const withPhoto = members.filter(m => m.photo).length;
    const married = members.filter(m => m.spouse).length;
    const withDob = members.filter(m => m.dob).length;

    // Upcoming birthdays (next 30 days)
    const today = new Date();
    const upcoming = members.filter(m => {
      if (!m.dob) return false;
      const dob = new Date(m.dob);
      const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      const diff = (next - today) / (1000 * 60 * 60 * 24);
      return diff <= 30;
    }).sort((a, b) => {
      const getNext = d => {
        const dob = new Date(d);
        const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (next < today) next.setFullYear(today.getFullYear() + 1);
        return next;
      };
      return getNext(a.dob) - getNext(b.dob);
    });

    // Generations
    const generations = new Set(members.map(m => {
      let gen = 0;
      let current = m;
      while ((current.parents || []).length) {
        gen++;
        current = members.find(p => String(p._id) === String(current.parents[0])) || {};
        if (gen > 10) break;
      }
      return gen;
    })).size;

    return { total, male, female, other, withEmail, withPhoto, married, withDob, upcoming, generations };
  }, [members]);

  const StatCard = ({ icon, label, value, color }) => (
    <div style={{
      background: 'var(--bg-card)', borderRadius: '14px',
      padding: '1rem 1.25rem', border: '1.5px solid var(--border)',
      boxShadow: 'var(--shadow-card)', display: 'flex',
      alignItems: 'center', gap: '0.75rem',
    }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', marginTop: '0.2rem' }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.45)',
      backdropFilter: 'blur(6px)',
      display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 100, padding: '1rem',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="scale-in" style={{
        background: 'var(--bg-modal)', borderRadius: '24px',
        width: '100%', maxWidth: '600px', maxHeight: '90vh',
        overflowY: 'auto', boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border)',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.75rem 1.75rem 0' }}>
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', color: 'var(--forest)', fontWeight: 700 }}>Family Stats</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', marginTop: '0.2rem' }}>Overview of your family tree</p>
          </div>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg-input)', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-soft)' }}>✕</button>
        </div>

        <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Main stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <StatCard icon="👥" label="Total Members" value={stats.total} color="#16a34a" />
            <StatCard icon="🌿" label="Generations" value={stats.generations} color="#0ea5e9" />
            <StatCard icon="💍" label="Married" value={stats.married / 2 | 0} color="#f59e0b" />
            <StatCard icon="👨" label="Male" value={stats.male} color="#3b82f6" />
            <StatCard icon="👩" label="Female" value={stats.female} color="#ec4899" />
            <StatCard icon="📸" label="Have Photos" value={stats.withPhoto} color="#8b5cf6" />
          </div>

          {/* Gender bar */}
          {stats.total > 0 && (
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '0.5rem' }}>Gender Distribution</div>
              <div style={{ display: 'flex', borderRadius: '99px', overflow: 'hidden', height: '10px', gap: '2px' }}>
                {stats.male > 0 && <div style={{ flex: stats.male, background: '#3b82f6', borderRadius: '99px' }} title={`Male: ${stats.male}`} />}
                {stats.female > 0 && <div style={{ flex: stats.female, background: '#ec4899', borderRadius: '99px' }} title={`Female: ${stats.female}`} />}
                {stats.other > 0 && <div style={{ flex: stats.other, background: '#8b5cf6', borderRadius: '99px' }} title={`Other: ${stats.other}`} />}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                {[['👨 Male', stats.male, '#3b82f6'], ['👩 Female', stats.female, '#ec4899'], ['🧑 Other', stats.other, '#8b5cf6']].map(([label, val, color]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-soft)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                    {label}: {val}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming birthdays */}
          {stats.upcoming.length > 0 && (
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '0.75rem' }}>
                🎂 Upcoming Birthdays (next 30 days)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stats.upcoming.map(m => {
                  const dob = new Date(m.dob);
                  const next = new Date(new Date().getFullYear(), dob.getMonth(), dob.getDate());
                  if (next < new Date()) next.setFullYear(next.getFullYear() + 1);
                  const days = Math.ceil((next - new Date()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={m._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.9rem', background: 'var(--sage-soft)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🎂</span>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-dark)' }}>{m.name}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: days <= 7 ? '#dc2626' : 'var(--text-soft)', fontWeight: days <= 7 ? 700 : 400 }}>
                        {days === 0 ? '🎉 Today!' : days === 1 ? 'Tomorrow' : `${days} days`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Email coverage */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-mid)' }}>📧 Email coverage</span>
              <span style={{ color: 'var(--text-soft)' }}>{stats.withEmail}/{stats.total}</span>
            </div>
            <div style={{ background: 'var(--border)', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${stats.total ? (stats.withEmail / stats.total) * 100 : 0}%`, background: 'var(--btn-grad)', height: '100%', borderRadius: '99px', transition: 'width 0.8s ease' }} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}