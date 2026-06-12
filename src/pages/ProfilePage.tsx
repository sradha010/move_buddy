import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Car, Star, ChevronRight, LogOut, Bell, Shield,
  HelpCircle, Gift, Trophy, Wallet, History,
  Settings, UserCircle, Phone,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../lib/api';

const spring = { type: 'spring', stiffness: 300, damping: 25 } as const;

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  to?: string;
  badge?: string;
  danger?: boolean;
  onClick?: () => void;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

function MenuRow({ item, index }: { item: MenuItem; index: number }) {
  const Icon = item.icon;

  const inner = (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...spring, delay: index * 0.04 }}
      className={`flex items-center gap-4 px-4 py-3.5 group cursor-pointer transition-colors duration-150 ${
        item.danger
          ? 'hover:bg-red-500/5'
          : 'hover:bg-white/[0.03]'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
        item.danger
          ? 'bg-red-500/10 text-red-400 group-hover:bg-red-500/20'
          : 'bg-white/[0.06] text-muted group-hover:bg-primary/10 group-hover:text-primary'
      }`}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${item.danger ? 'text-red-400' : 'text-text-light'}`}>
          {item.label}
        </p>
        {item.sublabel && (
          <p className="text-xs text-muted mt-0.5">{item.sublabel}</p>
        )}
      </div>

      {item.badge && (
        <span className="text-xs font-semibold bg-primary/15 text-primary px-2.5 py-0.5 rounded-full border border-primary/20 shrink-0">
          {item.badge}
        </span>
      )}

      <ChevronRight className={`w-4 h-4 shrink-0 transition-all group-hover:translate-x-0.5 ${
        item.danger ? 'text-red-400/50' : 'text-muted/40 group-hover:text-muted'
      }`} />
    </motion.div>
  );

  if (item.onClick) {
    return <button onClick={item.onClick} className="w-full text-left">{inner}</button>;
  }
  if (item.to) {
    return <Link to={item.to}>{inner}</Link>;
  }
  return inner;
}

export default function ProfilePage() {
  const { user, setUser, setAuthenticated, setAccessToken } = useApp();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await api.post('/auth/logout'); } catch { /* proceed */ }
    localStorage.removeItem('buddyride_token');
    setAuthenticated(false);
    setUser(null);
    setAccessToken(null);
    navigate('/');
  };

  const initials = user?.name ? getInitials(user.name) : 'U';

  const sections: MenuSection[] = [
    {
      title: 'Activity',
      items: [
        { icon: History, label: 'My Rides', sublabel: 'View all past and upcoming rides', to: '/dashboard' },
        { icon: Wallet,  label: 'Payments', sublabel: 'Manage payment methods & history', to: '/guest/subscribe' },
      ],
    },
    {
      title: 'Perks',
      items: [
        { icon: Gift,   label: 'Refer & Earn', sublabel: 'Invite friends and earn rewards', badge: '₹50 per referral' },
        { icon: Trophy, label: 'My Rewards',   sublabel: 'Redeem points and offers' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: Bell,        label: 'Notifications', sublabel: 'Manage alerts & preferences', to: '/notifications' },
        { icon: Shield,      label: 'Safety',        sublabel: 'Emergency contacts & safety tools' },
        { icon: HelpCircle,  label: 'Help & Support', sublabel: 'FAQs, chat support, report an issue' },
      ],
    },
    {
      title: 'App',
      items: [
        { icon: Settings, label: 'Settings', sublabel: 'App preferences & account settings' },
      ],
    },
  ];

  let globalIndex = 0;

  return (
    <div className="min-h-screen bg-bg pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-4">

        {/* ── Hero Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="relative bg-gradient-to-br from-teal to-teal/60 rounded-3xl p-6 mb-6 overflow-hidden"
        >
          {/* decorative blobs */}
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-xl">
              {user?.profile_photo ? (
                <img src={user.profile_photo} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-syne font-bold text-2xl text-white">{initials}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="font-syne font-bold text-xl text-white truncate">
                {user?.name ?? 'BuddyRide User'}
              </h2>
              <div className="flex items-center gap-1.5 mt-1">
                <Phone className="w-3.5 h-3.5 text-white/60" />
                <span className="text-sm text-white/70 font-mono">{user?.phone ?? '—'}</span>
              </div>
              {user?.email && (
                <p className="text-xs text-white/50 mt-0.5 truncate">{user.email}</p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  user?.role === 'admin'
                    ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                    : 'bg-white/10 text-white/80 border-white/20'
                } capitalize`}>
                  {user?.role ?? 'guest'}
                </span>
                {user?.is_verified && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                    Verified
                  </span>
                )}
              </div>
            </div>

            {/* Edit / profile icon */}
            <Link
              to="/profile/edit"
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors shrink-0"
            >
              <UserCircle className="w-5 h-5 text-white/80" />
            </Link>
          </div>

          {/* Rating strip */}
          <div className="relative z-10 flex items-center gap-6 mt-5 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-white">4.8</span>
              <span className="text-xs text-white/50">Your rating</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-1.5">
              <Car className="w-4 h-4 text-white/60" />
              <span className="text-sm font-semibold text-white">0</span>
              <span className="text-xs text-white/50">trips</span>
            </div>
          </div>
        </motion.div>

        {/* ── Menu Sections ── */}
        <div className="space-y-3">
          {sections.map((section) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.1 }}
              className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden"
            >
              <p className="text-xs font-semibold text-muted/60 uppercase tracking-wider px-4 pt-3 pb-1">
                {section.title}
              </p>
              <div className="divide-y divide-white/[0.05]">
                {section.items.map((item) => (
                  <MenuRow key={item.label} item={item} index={globalIndex++} />
                ))}
              </div>
            </motion.div>
          ))}

          {/* Logout */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.25 }}
            className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden"
          >
            <MenuRow
              item={{
                icon: LogOut,
                label: loggingOut ? 'Logging out…' : 'Logout',
                danger: true,
                onClick: handleLogout,
              }}
              index={globalIndex++}
            />
          </motion.div>
        </div>

        <p className="text-center text-xs text-muted/30 mt-8">BuddyRide v1.0 · Made with ♥</p>
      </div>
    </div>
  );
}
