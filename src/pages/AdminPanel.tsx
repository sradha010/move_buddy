import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, DollarSign, Palette, Settings, ChevronRight, ChevronLeft,
  Save, User, LayoutDashboard, FileText, Shield, CheckCircle,
  XCircle, AlertCircle, RefreshCw, TrendingUp, Car,
  Search, Eye, LogOut, ArrowUpRight, Activity,
  CreditCard, Clock, BarChart3, UserCheck, Menu as MenuIcon, KeyRound,
} from 'lucide-react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'users' | 'documents' | 'pricing' | 'branding' | 'navbar' | 'subscriptions' | 'audit';

interface DashboardStats {
  total_users: number; total_hosts: number; total_guests: number;
  active_rides: number; completed_rides_today: number; total_revenue: number;
  active_subscriptions: number; open_reports: number; users_this_week: number;
}
interface AdminUser {
  id: string; name: string; email: string; phone: string;
  role: 'guest' | 'host' | 'admin'; is_verified: boolean; is_suspended: boolean; created_at: string;
}
interface Document {
  id: string; status: 'pending' | 'approved' | 'rejected';
  aadhaar_url: string | null; driving_license_url: string | null;
  vehicle_rc_url: string | null; insurance_url: string | null; created_at: string;
  user: { id: string; name: string; email: string; phone: string; profile_photo: string | null };
}
interface Subscription {
  id: string; plan_type: string; plan_days: number; price_paid: number;
  status: string; started_at: string; ends_at: string;
  user: { id: string; name: string; email: string; phone: string };
}
interface AuditLog {
  id: string; action: string; entity_type: string | null; entity_id: string | null;
  created_at: string; user: { id: string; name: string; email: string; role: string };
}

// ─── Design config ────────────────────────────────────────────────────────────

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 28 };

// ─── Shared primitives ────────────────────────────────────────────────────────

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  return <div className={`${s} border-2 border-orange-300 border-t-[#FF7D00] rounded-full animate-spin`} />;
}

function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="font-syne font-bold text-2xl text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-white border border-red-100 rounded-2xl p-10 text-center shadow-sm">
      <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-6 h-6 text-red-500" />
      </div>
      <p className="font-semibold text-gray-800 mb-1">Failed to load data</p>
      <p className="text-sm text-gray-500 mb-4 max-w-xs mx-auto">{message}</p>
      {onRetry && (
        <button onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-sm">
      <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-gray-300" />
      </div>
      <p className="font-semibold text-gray-600">{title}</p>
      {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function StatusPill({ value, trueLabel = 'Active', falseLabel = 'Inactive' }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${value ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${value ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {value ? trueLabel : falseLabel}
    </span>
  );
}

function RolePill({ role }: { role: string }) {
  const s: Record<string, string> = {
    admin: 'bg-orange-50 text-orange-700 border border-orange-200',
    host:  'bg-teal-50 text-teal-700 border border-teal-200',
    guest: 'bg-gray-100 text-gray-600 border border-gray-200',
  };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${s[role] ?? s.guest}`}>{role}</span>;
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium">
      <CheckCircle className="w-4 h-4 shrink-0" /> {message}
    </div>
  );
}

function FailBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
      <AlertCircle className="w-4 h-4 shrink-0" /> {message}
    </div>
  );
}

function SaveButton({ saving, label = 'Save Changes', onClick }: { saving: boolean; label?: string; onClick: () => void }) {
  return (
    <motion.button onClick={onClick} disabled={saving}
      whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: 0.97 }}
      className="flex items-center gap-2 px-6 py-2.5 bg-[#FF7D00] text-white font-semibold text-sm rounded-xl hover:bg-[#e06d00] transition-colors shadow-sm shadow-orange-200 disabled:opacity-60 disabled:cursor-not-allowed">
      {saving ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
      {saving ? 'Saving…' : label}
    </motion.button>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onPage(page - 1)} disabled={page === 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="px-3 text-sm text-gray-500">{page} / {totalPages}</span>
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Tab: Dashboard ───────────────────────────────────────────────────────────

function DashboardTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api.get<DashboardStats>('/admin/dashboard');
      setStats(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const colorMap: Record<string, { bg: string; icon: string }> = {
    orange: { bg: 'bg-orange-50', icon: 'text-[#FF7D00]' },
    teal:   { bg: 'bg-teal-50',   icon: 'text-[#15616D]' },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600'  },
    green:  { bg: 'bg-emerald-50',icon: 'text-emerald-600'},
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
    red:    { bg: 'bg-red-50',    icon: 'text-red-500'   },
  };

  const cards = stats ? [
    { label: 'Total Users',     value: stats.total_users.toLocaleString('en-IN'),                          icon: Users,      color: 'orange', sub: `+${stats.users_this_week} this week` },
    { label: 'Active Hosts',    value: stats.total_hosts.toLocaleString('en-IN'),                          icon: Car,        color: 'teal',   sub: 'Offering rides' },
    { label: 'Active Guests',   value: stats.total_guests.toLocaleString('en-IN'),                         icon: UserCheck,  color: 'blue',   sub: 'Using rides' },
    { label: 'Active Rides',    value: stats.active_rides.toLocaleString('en-IN'),                         icon: Activity,   color: 'green',  sub: 'Right now' },
    { label: 'Rides Today',     value: stats.completed_rides_today.toLocaleString('en-IN'),                icon: TrendingUp, color: 'purple', sub: 'Completed' },
    { label: 'Revenue',         value: `₹${stats.total_revenue.toLocaleString('en-IN')}`,                 icon: DollarSign, color: 'orange', sub: 'All time' },
    { label: 'Subscriptions',   value: stats.active_subscriptions.toLocaleString('en-IN'),                 icon: CreditCard, color: 'teal',   sub: 'Active plans' },
    { label: 'Open Reports',    value: stats.open_reports.toLocaleString('en-IN'),                         icon: AlertCircle,color: 'red',    sub: 'Need review' },
  ] : [];

  return (
    <div>
      <PageHeader title="Dashboard Overview" subtitle="Live platform metrics"
        action={
          <button onClick={load}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      {error && <div className="mb-6"><ErrorState message={error} onRetry={load} /></div>}

      {loading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
              <div className="w-10 h-10 bg-gray-100 rounded-xl mb-3" />
              <div className="h-6 bg-gray-100 rounded w-16 mb-1" />
              <div className="h-3 bg-gray-100 rounded w-24" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cards.map((card, i) => {
              const c = colorMap[card.color];
              return (
                <motion.div key={card.label}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: i * 0.05 }}
                  className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-gray-200 transition-all">
                  <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <card.icon className={`w-5 h-5 ${c.icon}`} />
                  </div>
                  <p className="font-syne font-bold text-2xl text-gray-900 leading-tight">{card.value}</p>
                  <p className="text-gray-600 text-xs mt-1 font-medium">{card.label}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{card.sub}</p>
                </motion.div>
              );
            })}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.4 }}
            className="mt-6 bg-white border border-gray-100 rounded-2xl p-6">
            <h3 className="font-syne font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#FF7D00]" /> Platform Snapshot
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: 'New users this week', value: stats.users_this_week, suffix: ' users' },
                { label: 'Rides completed today', value: stats.completed_rides_today, suffix: ' rides' },
                { label: 'Active subscriptions', value: stats.active_subscriptions, suffix: ' plans' },
              ].map(item => (
                <div key={item.label} className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="font-syne font-bold text-2xl text-gray-900 mt-1">
                    {item.value.toLocaleString('en-IN')}<span className="text-sm text-gray-400 font-normal">{item.suffix}</span>
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

// ─── Tab: Users ───────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const data = await api.get<{ users: AdminUser[]; total: number }>(`/admin/users?${params}`);
      setUsers(data.users); setTotal(data.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSuspend = async (id: string, name: string) => {
    if (!confirm(`Suspend ${name}?`)) return;
    setActionLoading(id);
    try {
      await api.patch(`/admin/users/${id}/suspend`, { reason: 'Suspended by admin' });
      setActionMsg(`${name} suspended.`);
      load();
    } catch (e: any) { setActionMsg(`Error: ${e.message}`); }
    finally { setActionLoading(null); setTimeout(() => setActionMsg(''), 3000); }
  };

  const handleActivate = async (id: string, name: string) => {
    setActionLoading(id);
    try {
      await api.patch(`/admin/users/${id}/activate`);
      setActionMsg(`${name} activated.`);
      load();
    } catch (e: any) { setActionMsg(`Error: ${e.message}`); }
    finally { setActionLoading(null); setTimeout(() => setActionMsg(''), 3000); }
  };

  return (
    <div>
      <PageHeader title="User Management" subtitle={`${total} registered users`} />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email, phone…"
            className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15 transition-all" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="h-10 px-3.5 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:border-orange-400 transition-all min-w-[120px]">
          <option value="">All Roles</option>
          <option value="guest">Guest</option>
          <option value="host">Host</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <AnimatePresence>
        {actionMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4">
            {actionMsg.startsWith('Error') ? <FailBanner message={actionMsg} /> : <SuccessBanner message={actionMsg} />}
          </motion.div>
        )}
      </AnimatePresence>

      {error ? <ErrorState message={error} onRetry={load} /> : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['User', 'Phone', 'Role', 'Status', 'Verified', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center"><div className="flex justify-center"><Spinner /></div></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No users found</td></tr>
                ) : users.map((u, i) => (
                  <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0 text-sm font-bold text-[#FF7D00]">
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 font-mono">{u.phone}</td>
                    <td className="px-5 py-4"><RolePill role={u.role} /></td>
                    <td className="px-5 py-4"><StatusPill value={!u.is_suspended} trueLabel="Active" falseLabel="Suspended" /></td>
                    <td className="px-5 py-4"><StatusPill value={u.is_verified} trueLabel="Verified" falseLabel="Pending" /></td>
                    <td className="px-5 py-4">
                      {actionLoading === u.id ? <Spinner size="sm" /> :
                        u.is_suspended ? (
                          <button onClick={() => handleActivate(u.id, u.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" /> Activate
                          </button>
                        ) : u.role !== 'admin' ? (
                          <button onClick={() => handleSuspend(u.id, u.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors">
                            <XCircle className="w-3.5 h-3.5" /> Suspend
                          </button>
                        ) : <span className="text-xs text-gray-400">—</span>
                      }
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">{total} total users</span>
            <Pagination page={page} totalPages={Math.ceil(total / 15)} onPage={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Documents ───────────────────────────────────────────────────────────

function DocumentsTab() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api.get<{ documents: Document[]; total: number }>(`/admin/documents?page=${page}&limit=10`);
      setDocs(data.documents); setTotal(data.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string, name: string) => {
    setActionLoading(id);
    try {
      await api.patch(`/admin/documents/${id}/approve`);
      setActionMsg(`Documents for ${name} approved.`);
      load();
    } catch (e: any) { setActionMsg(`Error: ${e.message}`); }
    finally { setActionLoading(null); setTimeout(() => setActionMsg(''), 3500); }
  };

  const handleReject = async (id: string, name: string) => {
    const reason = prompt(`Rejection reason for ${name}:`);
    if (!reason?.trim()) return;
    setActionLoading(id);
    try {
      await api.patch(`/admin/documents/${id}/reject`, { reason });
      setActionMsg(`Documents for ${name} rejected.`);
      load();
    } catch (e: any) { setActionMsg(`Error: ${e.message}`); }
    finally { setActionLoading(null); setTimeout(() => setActionMsg(''), 3500); }
  };

  return (
    <div>
      <PageHeader title="Document Verification" subtitle="Review and approve host KYC documents" />

      <AnimatePresence>
        {actionMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4">
            {actionMsg.startsWith('Error') ? <FailBanner message={actionMsg} /> : <SuccessBanner message={actionMsg} />}
          </motion.div>
        )}
      </AnimatePresence>

      {error ? <ErrorState message={error} onRetry={load} /> :
        loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white border border-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : docs.length === 0 ? (
          <EmptyState icon={CheckCircle} title="All documents reviewed" subtitle="No pending verifications" />
        ) : (
          <div className="space-y-3">
            {docs.map((doc, i) => (
              <motion.div key={doc.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: i * 0.07 }}
                className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:border-gray-200 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center font-bold text-[#FF7D00] text-lg shrink-0">
                      {doc.user.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{doc.user.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{doc.user.phone} · {doc.user.email || '—'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Submitted {new Date(doc.created_at).toLocaleDateString('en-IN')} ·
                        <span className={`ml-1 font-medium capitalize ${
                          doc.status === 'pending' ? 'text-yellow-600' :
                          doc.status === 'approved' ? 'text-emerald-600' : 'text-red-600'
                        }`}>{doc.status}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {([['Aadhaar', doc.aadhaar_url], ['Driving Licence', doc.driving_license_url], ['Vehicle RC', doc.vehicle_rc_url], ['Insurance', doc.insurance_url]] as [string, string | null][]).map(([label, url]) =>
                      url ? (
                        <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                          <Eye className="w-3 h-3" /> {label}
                        </a>
                      ) : null
                    )}
                  </div>
                  {doc.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      {actionLoading === doc.id ? <Spinner /> : (
                        <>
                          <button onClick={() => handleApprove(doc.id, doc.user.name)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-200">
                            <CheckCircle className="w-4 h-4" /> Approve
                          </button>
                          <button onClick={() => handleReject(doc.id, doc.user.name)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">
                            <XCircle className="w-4 h-4" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )
      }
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-gray-400">{total} documents</span>
        <Pagination page={page} totalPages={Math.ceil(total / 10)} onPage={setPage} />
      </div>
    </div>
  );
}

// ─── Tab: Pricing ─────────────────────────────────────────────────────────────

function PricingTab() {
  const [rates, setRates] = useState({ per_km_rate: 6, rapido_rate: 7, auto_rate: 8, ola_rate: 10, uber_rate: 12 });
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    api.get<typeof rates>('/pricing')
      .then(setRates)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaveStatus('idle');
    try {
      await api.patch('/admin/pricing', { ...rates, reason: reason || 'Admin update' });
      setSaveStatus('ok'); setSaveMsg('Pricing updated successfully.');
      setReason('');
    } catch (e: any) { setSaveStatus('err'); setSaveMsg(e.message); }
    finally { setSaving(false); setTimeout(() => setSaveStatus('idle'), 4000); }
  };

  const fields = [
    { key: 'per_km_rate', label: 'BuddyRide Rate', tag: 'Platform' },
    { key: 'rapido_rate', label: 'Rapido Rate',     tag: 'Comparison' },
    { key: 'auto_rate',   label: 'Auto Rate',       tag: 'Comparison' },
    { key: 'ola_rate',    label: 'Ola Rate',        tag: 'Comparison' },
    { key: 'uber_rate',   label: 'Uber Rate',       tag: 'Comparison' },
  ] as const;

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error)   return <ErrorState message={error} />;

  const maxRate = Math.max(...fields.map(f => rates[f.key]));

  return (
    <div>
      <PageHeader title="Pricing Configuration" subtitle="Set per-kilometre rates across platforms" />
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#FF7D00]" />
          <span className="text-sm font-semibold text-gray-700">Rate Configuration (₹ per km)</span>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-5">
            {fields.map(({ key, label, tag }) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">{label}</label>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tag === 'Platform' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>{tag}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-mono">₹</span>
                  <input type="number" value={rates[key]} min={0.5} step={0.5}
                    onChange={e => setRates(r => ({ ...r, [key]: parseFloat(e.target.value) || 0 }))}
                    className="w-full h-11 pl-8 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15 focus:bg-white transition-all" />
                </div>
              </div>
            ))}
          </div>

          {/* Visual comparison */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rate Comparison</p>
            <div className="space-y-2.5">
              {fields.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${maxRate > 0 ? (rates[key] / maxRate) * 100 : 0}%` }}
                      transition={{ duration: 0.5 }}
                      className={`h-full rounded-full ${key === 'per_km_rate' ? 'bg-[#FF7D00]' : 'bg-[#15616D]/50'}`}
                    />
                  </div>
                  <span className="text-xs font-mono font-semibold text-gray-700 w-10 text-right">₹{rates[key]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Reason for change <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Fuel price adjustment"
              className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15 focus:bg-white transition-all" />
          </div>

          <AnimatePresence>
            {saveStatus !== 'idle' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                {saveStatus === 'ok' ? <SuccessBanner message={saveMsg} /> : <FailBanner message={saveMsg} />}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end pt-2">
            <SaveButton saving={saving} onClick={handleSave} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Branding ────────────────────────────────────────────────────────────

function BrandingTab() {
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#FF7D00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    api.get<{ logo_url: string | null; primary_color: string }>('/admin/branding')
      .then(d => { setLogoUrl(d.logo_url ?? ''); setPrimaryColor(d.primary_color ?? '#FF7D00'); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaveStatus('idle');
    try {
      await api.patch('/admin/branding', { ...(logoUrl && { logo_url: logoUrl }), primary_color: primaryColor });
      setSaveStatus('ok'); setSaveMsg('Branding saved successfully.');
    } catch (e: any) { setSaveStatus('err'); setSaveMsg(e.message); }
    finally { setSaving(false); setTimeout(() => setSaveStatus('idle'), 4000); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error)   return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader title="Branding Editor" subtitle="Customize platform logo and brand colors" />
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Logo URL</label>
              <input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15 focus:bg-white transition-all" />
              <p className="text-xs text-gray-400">Leave empty to use default BuddyRide logo</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Primary Brand Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                  className="w-11 h-11 rounded-xl border-2 border-gray-200 cursor-pointer p-1 bg-white" />
                <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                  className="flex-1 h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15 focus:bg-white transition-all" />
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Preview</p>
            </div>
            <div className="p-5 bg-[#0D1B1E] flex items-center gap-8">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                  <Car className="w-4 h-4 text-white" />
                </div>
                <span className="font-syne font-bold text-white text-lg">BuddyRide</span>
              </div>
              <div className="flex gap-2 ml-4">
                {['Find a Ride', 'Offer a Ride', 'Dashboard'].map(l => (
                  <span key={l} className="text-xs text-white/60 px-2 py-1">{l}</span>
                ))}
              </div>
              <div className="ml-auto">
                <span className="text-xs font-semibold px-4 py-1.5 rounded-full text-white" style={{ backgroundColor: primaryColor }}>Get Started</span>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {saveStatus !== 'idle' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                {saveStatus === 'ok' ? <SuccessBanner message={saveMsg} /> : <FailBanner message={saveMsg} />}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end"><SaveButton saving={saving} onClick={handleSave} /></div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Navbar ──────────────────────────────────────────────────────────────

function NavbarTab() {
  const [links, setLinks] = useState(JSON.stringify([
    { label: 'Find a Ride', path: '/guest/find' },
    { label: 'Offer a Ride', path: '/host/offer' },
    { label: 'Dashboard', path: '/dashboard' },
  ], null, 2));
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [jsonValid, setJsonValid] = useState(true);

  const handleChange = (v: string) => {
    setLinks(v);
    try { JSON.parse(v); setJsonValid(true); } catch { setJsonValid(false); }
  };

  const handleSave = async () => {
    if (!jsonValid) return;
    setSaving(true); setSaveStatus('idle');
    try {
      const parsed = JSON.parse(links);
      await api.patch('/admin/branding', { navbar_links: parsed });
      setSaveStatus('ok'); setSaveMsg('Navbar configuration saved.');
    } catch (e: any) { setSaveStatus('err'); setSaveMsg(e.message); }
    finally { setSaving(false); setTimeout(() => setSaveStatus('idle'), 4000); }
  };

  return (
    <div>
      <PageHeader title="Navbar Configuration" subtitle="Edit navigation links via JSON" />
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-600">Each entry needs a <code className="bg-gray-200 text-[#FF7D00] px-1.5 py-0.5 rounded text-xs font-mono">label</code> and <code className="bg-gray-200 text-[#FF7D00] px-1.5 py-0.5 rounded text-xs font-mono">path</code></p>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${jsonValid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
            {jsonValid ? '✓ Valid JSON' : '✗ Invalid JSON'}
          </span>
        </div>
        <div className="p-6 space-y-4">
          <textarea value={links} onChange={e => handleChange(e.target.value)} rows={12} spellCheck={false}
            className="w-full bg-gray-950 text-emerald-400 font-mono text-sm rounded-xl p-5 border border-gray-800 focus:outline-none focus:border-orange-500 resize-none leading-relaxed" />
          <AnimatePresence>
            {saveStatus !== 'idle' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                {saveStatus === 'ok' ? <SuccessBanner message={saveMsg} /> : <FailBanner message={saveMsg} />}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex justify-end">
            <SaveButton saving={saving} label="Save Navbar Config" onClick={handleSave} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Subscriptions ───────────────────────────────────────────────────────

function SubscriptionsTab() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [planFilter, setPlanFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (planFilter) params.set('plan_type', planFilter);
      const data = await api.get<{ subscriptions: Subscription[]; total: number }>(`/admin/subscriptions?${params}`);
      setSubs(data.subscriptions); setTotal(data.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, planFilter]);

  useEffect(() => { load(); }, [load]);

  const statusStyle = (s: string) => ({
    active:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
    expired:   'bg-gray-100 text-gray-500 border border-gray-200',
    cancelled: 'bg-red-50 text-red-600 border border-red-200',
  }[s] ?? 'bg-gray-100 text-gray-500 border border-gray-200');

  const planLabel = (p: string) => ({ '7d': 'Daily · 7d', '15d': 'Weekly · 15d', '30d': 'Monthly · 30d' }[p] ?? p);

  return (
    <div>
      <PageHeader title="Subscriptions" subtitle={`${total} total subscriptions`} />

      <div className="flex gap-2 mb-5">
        {[['', 'All Plans'], ['7d', 'Daily'], ['15d', 'Weekly'], ['30d', 'Monthly']].map(([val, label]) => (
          <button key={val} onClick={() => { setPlanFilter(val); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${planFilter === val ? 'bg-[#FF7D00] text-white shadow-sm shadow-orange-200' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['User', 'Plan', 'Amount', 'Start', 'End', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><div className="flex justify-center"><Spinner /></div></td></tr>
              ) : subs.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No subscriptions found</td></tr>
              ) : subs.map((s, i) => (
                <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900 text-sm">{s.user.name}</p>
                    <p className="text-xs text-gray-400">{s.user.phone}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs font-semibold">{planLabel(s.plan_type)}</span>
                  </td>
                  <td className="px-5 py-4 font-mono font-semibold text-[#FF7D00]">₹{s.price_paid}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{new Date(s.started_at).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{new Date(s.ends_at).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusStyle(s.status)}`}>{s.status}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">{total} total</span>
            <Pagination page={page} totalPages={Math.ceil(total / 15)} onPage={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Audit Logs ──────────────────────────────────────────────────────────

function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api.get<{ logs: AuditLog[]; total: number }>(`/admin/audit-logs?page=${page}&limit=20`);
      setLogs(data.logs); setTotal(data.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const actionStyle = (action: string) => {
    if (action.includes('suspend') || action.includes('reject')) return { dot: 'bg-red-500', badge: 'bg-red-50 text-red-600 border border-red-200' };
    if (action.includes('activate') || action.includes('approve')) return { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    if (action.includes('pricing') || action.includes('branding')) return { dot: 'bg-[#FF7D00]', badge: 'bg-orange-50 text-orange-700 border border-orange-200' };
    return { dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600 border border-gray-200' };
  };

  const relTime = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(iso).toLocaleDateString('en-IN');
  };

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="All admin actions on the platform" />

      {error ? <ErrorState message={error} onRetry={load} /> :
        loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white border border-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : logs.length === 0 ? (
          <EmptyState icon={Shield} title="No audit logs yet" />
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            {logs.map((log, i) => {
              const s = actionStyle(log.action);
              return (
                <motion.div key={log.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ ...SPRING, delay: i * 0.04 }}
                  className={`flex items-center gap-4 px-5 py-4 ${i < logs.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/50 transition-colors`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                  <span className={`text-xs font-mono font-medium px-2.5 py-1 rounded-lg shrink-0 ${s.badge}`}>{log.action}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-semibold">{log.user.name}</span>
                      {log.entity_type && <span className="text-gray-400"> · {log.entity_type}{log.entity_id ? ` #${log.entity_id.slice(0, 6)}` : ''}</span>}
                    </p>
                    <p className="text-xs text-gray-400">{log.user.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400 whitespace-nowrap">{relTime(log.created_at)}</span>
                  </div>
                </motion.div>
              );
            })}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">{total} total logs</span>
              <Pagination page={page} totalPages={Math.ceil(total / 20)} onPage={setPage} />
            </div>
          </div>
        )
      }
    </div>
  );
}

// ─── Main AdminPanel ──────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const { user, setUser, setAuthenticated, setAccessToken } = useApp();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('buddyride_token');
    setAuthenticated(false); setUser(null); setAccessToken(null);
    navigate('/admin/login', { replace: true });
  };

  const tabs = [
    { id: 'dashboard' as Tab,     icon: LayoutDashboard, label: 'Dashboard'     },
    { id: 'users' as Tab,         icon: Users,           label: 'Users'         },
    { id: 'documents' as Tab,     icon: FileText,        label: 'Documents'     },
    { id: 'pricing' as Tab,       icon: DollarSign,      label: 'Pricing'       },
    { id: 'branding' as Tab,      icon: Palette,         label: 'Branding'      },
    { id: 'navbar' as Tab,        icon: MenuIcon,        label: 'Navbar'        },
    { id: 'subscriptions' as Tab, icon: CreditCard,      label: 'Subscriptions' },
    { id: 'audit' as Tab,         icon: Shield,          label: 'Audit Logs'    },
  ];

  const tabContent: Record<Tab, React.ReactNode> = {
    dashboard:     <DashboardTab />,
    users:         <UsersTab />,
    documents:     <DocumentsTab />,
    pricing:       <PricingTab />,
    branding:      <BrandingTab />,
    navbar:        <NavbarTab />,
    subscriptions: <SubscriptionsTab />,
    audit:         <AuditTab />,
  };

  return (
    <div className="min-h-screen flex bg-[#F0F4F5]">

      {/* Sidebar */}
      <motion.aside animate={{ width: collapsed ? 68 : 240 }} transition={SPRING}
        className="bg-[#0B1519] min-h-screen flex-shrink-0 flex flex-col z-10 shadow-xl shadow-black/20">

        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/[0.07]">
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-7 h-7 bg-[#FF7D00] rounded-lg flex items-center justify-center shrink-0">
                  <Car className="w-4 h-4 text-white" />
                </div>
                <span className="font-syne font-bold text-white text-base whitespace-nowrap">Admin</span>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button onClick={() => setCollapsed(c => !c)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all ${collapsed ? 'mx-auto' : 'ml-auto'}`}>
            <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={SPRING}>
              <ChevronLeft className="w-4 h-4" />
            </motion.div>
          </motion.button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button key={tab.id} onClick={() => setActiveTab(tab.id)}
                whileHover={{ x: collapsed ? 0 : 2 }}
                title={collapsed ? tab.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive ? 'bg-[#FF7D00] text-white shadow-lg shadow-orange-900/30' : 'text-white/55 hover:text-white hover:bg-white/[0.07]'
                }`}>
                <tab.icon className="w-4 h-4 shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                      className="font-medium whitespace-nowrap overflow-hidden">
                      {tab.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-2.5 border-t border-white/[0.07] space-y-1">
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-3 py-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-[#FF7D00]/20 border border-[#FF7D00]/30 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-[#FF7D00]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">{user?.name ?? 'Admin'}</p>
                  <p className="text-[10px] text-white/40 truncate">{user?.phone ?? user?.email ?? ''}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={handleLogout} title={collapsed ? 'Logout' : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm">
            <LogOut className="w-4 h-4 shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-medium">
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}>
              {tabContent[activeTab]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
