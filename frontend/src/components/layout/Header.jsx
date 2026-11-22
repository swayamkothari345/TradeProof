import React, { useState, useRef, useEffect } from 'react';
import {
  Bell, Sun, Moon, Menu, X,
  UserPlus, ClipboardList, MessageSquare, CheckCircle, Eye,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../services/api.js';

// ─── Notification type configuration ─────────────────────────────────────────

const NOTIF_CONFIG = {
  INVITATION:        { icon: UserPlus,      colorVar: 'var(--info)',   bgVar: 'var(--info-bg)'     },
  TEST_ASSIGNED:     { icon: ClipboardList, colorVar: 'var(--accent)', bgVar: 'var(--accent-subtle)' },
  FEEDBACK:          { icon: MessageSquare, colorVar: 'var(--warn)',   bgVar: 'var(--warn-bg)'     },
  DISPUTE_RESOLVED:  { icon: CheckCircle,   colorVar: 'var(--pos)',    bgVar: 'var(--pos-bg)'      },
  MENTOR_REVIEW:     { icon: Eye,           colorVar: 'var(--info)',   bgVar: 'var(--info-bg)'     },
  SYSTEM:            { icon: Bell,          colorVar: 'var(--text-3)', bgVar: 'var(--bg-raised)'   },
};

const roleColor = {
  STUDENT:   { text: 'var(--info)',               bg: 'var(--info-bg)'          },
  TRADER:    { text: 'var(--accent)',             bg: 'var(--accent-subtle)'    },
  MENTOR:    { text: 'var(--warn)',               bg: 'var(--warn-bg)'          },
  INSTITUTE: { text: 'var(--badge-purple-color)', bg: 'var(--badge-purple-bg)'  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function getNotifPath(notif, role) {
  const base = `/${(role ?? 'student').toLowerCase()}`;
  switch (notif.type) {
    case 'INVITATION':       return ['MENTOR', 'INSTITUTE'].includes(role) ? `${base}/students` : `${base}/mentors`;
    case 'TEST_ASSIGNED':    return `${base}/tests`;
    case 'FEEDBACK':         return `${base}/journal`;
    case 'DISPUTE_RESOLVED': return `${base}/disputes`;
    case 'MENTOR_REVIEW':    return `${base}/journal`;
    default:                 return null;
  }
}

// ─── Notification panel ───────────────────────────────────────────────────────

function NotificationPanel({ notifs, unread, onClose, onNotifClick, onMarkAll, isMarkingAll }) {
  return (
    <div
      className="animate-slide-up"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        maxHeight: 'min(480px, calc(100vh - 72px))',
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
            Notifications
          </span>
          {unread > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular"
              style={{ backgroundColor: 'var(--neg-bg)', color: 'var(--neg)' }}
            >
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={onMarkAll}
              disabled={isMarkingAll}
              className="text-[11px] font-medium transition-colors disabled:opacity-50"
              style={{ color: 'var(--accent)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-hover)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--accent)'}
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-raised)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Close notifications"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {!notifs?.length ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2.5 px-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-raised)' }}
            >
              <Bell size={18} style={{ color: 'var(--text-3)' }} />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>No notifications</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>You're all caught up</p>
            </div>
          </div>
        ) : (
          notifs.map((notif, i) => {
            const cfg = NOTIF_CONFIG[notif.type] ?? NOTIF_CONFIG.SYSTEM;
            const Icon = cfg.icon;
            return (
              <NotifItem
                key={notif.id}
                notif={notif}
                cfg={cfg}
                Icon={Icon}
                isLast={i === notifs.length - 1}
                onClick={() => onNotifClick(notif)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function NotifItem({ notif, cfg, Icon, isLast, onClick }) {
  const [hovered, setHovered] = useState(false);

  const baseBg = notif.isRead ? 'transparent' : 'var(--accent-subtle)';
  const hoverBg = 'var(--bg-raised)';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
      style={{
        backgroundColor: hovered ? hoverBg : baseBg,
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Unread dot */}
      <div className="w-1.5 mt-2 flex-shrink-0">
        {!notif.isRead && (
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
        )}
      </div>

      {/* Icon badge */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: cfg.bgVar, color: cfg.colorVar }}
      >
        <Icon size={13} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[12px] font-semibold leading-tight truncate"
          style={{ color: notif.isRead ? 'var(--text-2)' : 'var(--text)' }}
        >
          {notif.title}
        </p>
        <p className="text-[11px] mt-0.5 leading-relaxed truncate-2" style={{ color: 'var(--text-3)' }}>
          {notif.message}
        </p>
        <p className="text-[10px] mt-1 tabular" style={{ color: 'var(--text-3)' }}>
          {timeAgo(notif.createdAt)}
        </p>
      </div>
    </button>
  );
}

// ─── Main Header ──────────────────────────────────────────────────────────────

export default function Header({ title, onMenuOpen }) {
  const { dark, toggle } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [notifOpen, setNotifOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const bellBtnRef = useRef(null);
  const panelRef = useRef(null);

  const { data: notifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then(r => r.data.data),
    refetchInterval: 60000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = notifs?.filter(n => !n.isRead).length ?? 0;
  const rc = roleColor[user?.role] ?? roleColor.STUDENT;

  const initials = [user?.profile?.firstName, user?.profile?.lastName]
    .filter(Boolean).map(s => s[0].toUpperCase()).join('')
    || user?.email?.[0]?.toUpperCase() || 'U';

  const fullName = [user?.profile?.firstName, user?.profile?.lastName]
    .filter(Boolean).join(' ') || user?.email || '';

  // Click outside to close
  useEffect(() => {
    if (!notifOpen) return;
    function handleClick(e) {
      const clickedBell  = bellBtnRef.current?.contains(e.target);
      const clickedPanel = panelRef.current?.contains(e.target);
      if (!clickedBell && !clickedPanel) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifOpen]);

  // Escape key to close
  useEffect(() => {
    if (!notifOpen) return;
    function handleKey(e) {
      if (e.key === 'Escape') setNotifOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [notifOpen]);

  function openNotifications() {
    if (!notifOpen && bellBtnRef.current) {
      const rect = bellBtnRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        // Keep at least 8px from viewport right edge
        right: Math.max(8, window.innerWidth - rect.right),
        zIndex: 100,
        // Responsive width: 340px or narrower on small screens
        width: `min(340px, calc(100vw - 16px))`,
      });
    }
    setNotifOpen(o => !o);
  }

  function handleNotifClick(notif) {
    if (!notif.isRead) markReadMutation.mutate(notif.id);
    const path = getNotifPath(notif, user?.role);
    if (path) navigate(path);
    setNotifOpen(false);
  }

  return (
    <>
      <header
        className="h-[52px] flex items-center justify-between px-3 sm:px-5 flex-shrink-0"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile hamburger */}
          <button
            onClick={onMenuOpen}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-md transition-colors flex-shrink-0"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-raised)'; e.currentTarget.style.color = 'var(--text-2)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
            aria-label="Open navigation"
          >
            <Menu size={16} />
          </button>

          {/* Page title */}
          <h1
            className="text-[13px] font-semibold tracking-tight truncate"
            style={{ color: 'var(--text)' }}
          >
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-raised)'; e.currentTarget.style.color = 'var(--text-2)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Notification bell */}
          <button
            ref={bellBtnRef}
            onClick={openNotifications}
            className="relative w-8 h-8 flex items-center justify-center rounded-md transition-colors"
            style={{
              color: notifOpen ? 'var(--text-2)' : 'var(--text-3)',
              backgroundColor: notifOpen ? 'var(--bg-raised)' : 'transparent',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-raised)'; e.currentTarget.style.color = 'var(--text-2)'; }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = notifOpen ? 'var(--bg-raised)' : 'transparent';
              e.currentTarget.style.color = notifOpen ? 'var(--text-2)' : 'var(--text-3)';
            }}
            aria-label="Notifications"
            aria-expanded={notifOpen}
          >
            <Bell size={15} />
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center tabular">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-5 mx-1.5" style={{ backgroundColor: 'var(--border)' }} />

          {/* User chip */}
          <div className="flex items-center gap-2 pr-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: rc.bg, color: rc.text }}
            >
              {initials}
            </div>
            <div className="hidden sm:block leading-none">
              <p className="text-[12px] font-medium leading-none" style={{ color: 'var(--text)' }}>
                {fullName}
              </p>
              <p className="text-[10px] mt-0.5 font-medium" style={{ color: rc.text }}>
                {user?.role?.charAt(0) + user?.role?.slice(1).toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Notification panel — rendered outside header to escape overflow containers */}
      {notifOpen && (
        <div ref={panelRef} style={dropdownStyle}>
          <NotificationPanel
            notifs={notifs}
            unread={unread}
            onClose={() => setNotifOpen(false)}
            onNotifClick={handleNotifClick}
            onMarkAll={() => markAllMutation.mutate()}
            isMarkingAll={markAllMutation.isPending}
          />
        </div>
      )}
    </>
  );
}
