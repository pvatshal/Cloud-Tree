import { useState, useEffect, useRef } from 'react';
import API from '../api/axios';

const TYPE_CONFIG = {
  member_added:   { icon: '👤', color: '#16a34a' },
  member_edited:  { icon: '✏️',  color: '#3b82f6' },
  member_deleted: { icon: '🗑️', color: '#ef4444' },
  birthday:       { icon: '🎂', color: '#f59e0b' },
  anniversary:    { icon: '💍', color: '#ec4899' },
};

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen]             = useState(false);
  const [notifications, setNotifs]  = useState([]);
  const [unread, setUnread]         = useState(0);
  const [loading, setLoading]       = useState(false);
  const ref = useRef();

  const fetchUnread = async () => {
    try {
      const { data } = await API.get('/notifications/unread-count');
      setUnread(data.count);
    } catch {}
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/notifications');
      setNotifs(data);
      setUnread(data.filter(n => !n.read).length);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) fetchAll();
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifs(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await API.put('/notifications/read-all');
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch {}
  };

  const clearAll = async () => {
    try {
      await API.delete('/notifications/clear');
      setNotifs([]);
      setUnread(0);
    } catch {}
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '36px', height: '36px', borderRadius: '10px',
          border: '1.5px solid var(--border)', background: open ? 'var(--sage-soft)' : 'var(--bg-card)',
          cursor: 'pointer', fontSize: '1rem', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          position: 'relative', transition: 'background 0.2s',
        }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <div style={{
            position: 'absolute', top: '-5px', right: '-5px',
            background: '#ef4444', color: 'white',
            borderRadius: '99px', minWidth: '18px', height: '18px',
            fontSize: '0.65rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', border: '2px solid var(--bg-card)',
          }}>
            {unread > 99 ? '99+' : unread}
          </div>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="scale-in" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: '340px', background: 'var(--bg-modal)',
          borderRadius: '16px', boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)', zIndex: 200,
          fontFamily: 'DM Sans, sans-serif', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-dark)' }}>Notifications</span>
              {unread > 0 && (
                <span style={{ background: '#ef4444', color: 'white', borderRadius: '99px', padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 700 }}>{unread} new</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {unread > 0 && (
                <button onClick={markAllRead} style={{ fontSize: '0.75rem', color: 'var(--forest-light)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} style={{ fontSize: '0.75rem', color: 'var(--text-soft)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-soft)', fontSize: '0.9rem' }}>Loading...</div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1.25rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔕</div>
                <div style={{ color: 'var(--text-soft)', fontSize: '0.9rem' }}>No notifications yet</div>
              </div>
            ) : notifications.map(n => {
              const cfg = TYPE_CONFIG[n.type] || { icon: '📢', color: '#6b7280' };
              return (
                <div
                  key={n._id}
                  onClick={() => !n.read && markRead(n._id)}
                  style={{
                    display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                    padding: '0.85rem 1.25rem',
                    background: n.read ? 'transparent' : `${cfg.color}11`,
                    borderBottom: '1px solid var(--border)',
                    cursor: n.read ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!n.read) e.currentTarget.style.background = `${cfg.color}22`; }}
                  onMouseLeave={e => { if (!n.read) e.currentTarget.style.background = `${cfg.color}11`; }}
                >
                  {/* Icon */}
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${cfg.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-dark)', lineHeight: 1.4, fontWeight: n.read ? 400 : 600 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginTop: '0.2rem' }}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.color, flexShrink: 0, marginTop: '4px' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}