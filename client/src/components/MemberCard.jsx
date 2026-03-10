import { Handle, Position } from '@xyflow/react';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const GENDER_CONFIG = {
  male:   { bg: ['#eff6ff','#dbeafe'], border: '#93c5fd', badge: '#3b82f6', badgeDark: '#1d4ed8' },
  female: { bg: ['#fdf2f8','#fce7f3'], border: '#f9a8d4', badge: '#ec4899', badgeDark: '#be185d' },
  other:  { bg: ['#f5f3ff','#ede9fe'], border: '#c4b5fd', badge: '#8b5cf6', badgeDark: '#6d28d9' },
};

const DARK_GENDER_CONFIG = {
  male:   { bg: ['#0c1a2e','#0f2340'], border: '#1e3a5f', badge: '#3b82f6' },
  female: { bg: ['#2a0a1a','#3a0f22'], border: '#5f1d3a', badge: '#ec4899' },
  other:  { bg: ['#1a0f2e','#231540'], border: '#3d2575', badge: '#8b5cf6' },
};

function getInitials(name) {
  return name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export default function MemberCard({ member, onEdit, onDelete }) {
  const { dark } = useTheme();
  const cfg = (dark ? DARK_GENDER_CONFIG : GENDER_CONFIG)[member.gender] || (dark ? DARK_GENDER_CONFIG : GENDER_CONFIG).other;
  const initials = getInitials(member.name);

  const formatDate = d => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const cardStyle = {
    background: dark
      ? `linear-gradient(145deg, ${cfg.bg[0]}, ${cfg.bg[1]})`
      : `linear-gradient(145deg, ${cfg.bg[0]}, ${cfg.bg[1]})`,
    border: `1.5px solid ${cfg.border}`,
    borderRadius: '18px',
    padding: '1rem 0.9rem 0.75rem',
    textAlign: 'center',
    minWidth: '168px',
    maxWidth: '200px',
    boxShadow: 'var(--shadow-card)',
    position: 'relative',
    fontFamily: 'DM Sans, sans-serif',
    cursor: 'default',
  };

  const avatarStyle = {
    width: '48px', height: '48px', borderRadius: '50%',
    background: `linear-gradient(135deg, ${cfg.badge}cc, ${cfg.badge})`,
    color: 'white', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '0.95rem', fontWeight: 700,
    margin: '0 auto 0.6rem',
    boxShadow: `0 4px 12px ${cfg.badge}55`,
    letterSpacing: '0.03em',
    fontFamily: 'DM Sans, sans-serif',
  };

  return (
    <div style={cardStyle} className="member-card">
      <Handle type="target" position={Position.Top}
        style={{ background: cfg.badge, width: 8, height: 8, border: '2px solid white', top: -5 }} />
      <Handle type="source" position={Position.Bottom}
        style={{ background: cfg.badge, width: 8, height: 8, border: '2px solid white', bottom: -5 }} />
      <Handle type="source" position={Position.Right} id="right"
        style={{ background: 'var(--amber)', width: 8, height: 8, border: '2px solid white' }} />
      <Handle type="target" position={Position.Left} id="left"
        style={{ background: 'var(--amber)', width: 8, height: 8, border: '2px solid white' }} />

      {/* Initials Avatar */}
      <div style={avatarStyle}>{initials}</div>

      {/* Name */}
      <div style={{
        fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem',
        fontFamily: 'Playfair Display, serif',
        color: 'var(--text-dark)', lineHeight: 1.2,
      }}>
        {member.name}
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.18rem', marginBottom: '0.5rem' }}>
        {formatDate(member.dob) && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
            <span>🎂</span><span>{formatDate(member.dob)}</span>
          </div>
        )}
        {member.phone && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
            <span>📞</span><span>{member.phone}</span>
          </div>
        )}
      </div>

      {/* Hover-only action buttons */}
      <div className="member-actions" style={{
        display: 'flex', gap: '0.4rem', justifyContent: 'center',
      }}>
        <button
          onClick={() => onEdit(member)}
          title="Edit member"
          style={{
            width: '30px', height: '30px', borderRadius: '8px',
            background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
            border: `1px solid ${cfg.border}`,
            cursor: 'pointer', fontSize: '0.8rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.15s, background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >✏️</button>
        <button
          onClick={() => onDelete(member._id)}
          title="Remove member"
          style={{
            width: '30px', height: '30px', borderRadius: '8px',
            background: dark ? 'rgba(239,68,68,0.12)' : 'rgba(254,226,226,0.9)',
            border: '1px solid #fca5a5',
            cursor: 'pointer', fontSize: '0.8rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.15s, background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >🗑️</button>
      </div>
    </div>
  );
}