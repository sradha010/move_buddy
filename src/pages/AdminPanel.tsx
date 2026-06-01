import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, DollarSign, Palette, Menu, Settings, ChevronRight, Save, User } from 'lucide-react';

type Tab = 'users' | 'pricing' | 'branding' | 'navbar' | 'subscriptions';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'guest' | 'host' | 'admin';
  status: 'active' | 'inactive';
  rides: number;
  joined: string;
}

const sampleUsers: User[] = [
  { id: '1', name: 'Rahul Sharma', email: 'rahul@email.com', role: 'host', status: 'active', rides: 45, joined: 'Jan 2026' },
  { id: '2', name: 'Priya Patel', email: 'priya@email.com', role: 'guest', status: 'active', rides: 23, joined: 'Feb 2026' },
  { id: '3', name: 'Vikram Singh', email: 'vikram@email.com', role: 'host', status: 'active', rides: 67, joined: 'Dec 2025' },
  { id: '4', name: 'Ananya Reddy', email: 'ananya@email.com', role: 'guest', status: 'inactive', rides: 12, joined: 'Mar 2026' },
  { id: '5', name: 'Admin User', email: 'admin@buddyride.com', role: 'admin', status: 'active', rides: 0, joined: 'Nov 2025' },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Pricing state
  const [buddyRideRate, setBuddyRideRate] = useState(6);
  const [rapidoRate, setRapidoRate] = useState(7);
  const [autoRate, setAutoRate] = useState(8);
  const [olaRate, setOlaRate] = useState(10);
  const [uberRate, setUberRate] = useState(12);

  // Branding state
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#FF7D00');

  const tabs = [
    { id: 'users' as Tab, icon: Users, label: 'Users' },
    { id: 'pricing' as Tab, icon: DollarSign, label: 'Pricing' },
    { id: 'branding' as Tab, icon: Palette, label: 'Branding' },
    { id: 'navbar' as Tab, icon: Menu, label: 'Navbar' },
    { id: 'subscriptions' as Tab, icon: Settings, label: 'Subscriptions' },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-primary text-text-dark';
      case 'host':
        return 'bg-teal text-text-light';
      default:
        return 'bg-surface text-text-dark';
    }
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -100 }}
        animate={{ x: 0 }}
        className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-teal min-h-screen transition-all duration-300`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-teal/50 flex items-center justify-between">
          {sidebarOpen && (
            <span className="font-syne font-bold text-xl text-text-light">
              Admin
            </span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-text-light p-1"
          >
            <ChevronRight className={`w-5 h-5 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="p-2 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-text-dark'
                  : 'text-text-light/70 hover:bg-teal/80 hover:text-text-light'
              }`}
            >
              <tab.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm">{tab.label}</span>}
            </button>
          ))}
        </nav>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 p-6 pt-24">
        <div className="max-w-5xl mx-auto">
          {/* Users Tab */}
          {activeTab === 'users' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="font-syne font-bold text-2xl text-text-light mb-6">
                Users Management
              </h2>

              {/* Table */}
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-teal text-text-light text-sm">
                      <tr>
                        <th className="text-left px-4 py-3">User</th>
                        <th className="text-left px-4 py-3 hidden md:table-cell">Email</th>
                        <th className="text-left px-4 py-3">Role</th>
                        <th className="text-left px-4 py-3 hidden md:table-cell">Status</th>
                        <th className="text-left px-4 py-3 hidden md:table-cell">Rides</th>
                        <th className="text-left px-4 py-3 hidden md:table-cell">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleUsers.map((user) => (
                        <tr key={user.id} className="border-b border-teal/10 hover:bg-surface/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-teal/20 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-text-light" />
                              </div>
                              <span className="text-text-dark font-medium">{user.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted hidden md:table-cell">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadge(user.role)}`}>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className={`flex items-center gap-1 ${user.status === 'active' ? 'text-green-500' : 'text-red-400'}`}>
                              <span className="w-2 h-2 rounded-full bg-current" />
                              {user.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-dark hidden md:table-cell">{user.rides}</td>
                          <td className="px-4 py-3 text-muted hidden md:table-cell">{user.joined}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="font-syne font-bold text-2xl text-text-light mb-6">
                Pricing Configuration
              </h2>

              <div className="card">
                <p className="text-muted text-sm mb-6">
                  Set the rate per kilometer for each platform (in INR)
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* BuddyRide Rate */}
                  <div>
                    <label className="block text-sm text-text-dark mb-2">
                      BuddyRide Rate (Rs/km)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">Rs</span>
                      <input
                        type="number"
                        value={buddyRideRate}
                        onChange={(e) => setBuddyRideRate(parseInt(e.target.value) || 0)}
                        className="input-filled w-full pl-10 font-mono text-xl"
                      />
                    </div>
                  </div>

                  {/* Rapido Rate */}
                  <div>
                    <label className="block text-sm text-text-dark mb-2">
                      Rapido Rate (Rs/km)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">Rs</span>
                      <input
                        type="number"
                        value={rapidoRate}
                        onChange={(e) => setRapidoRate(parseInt(e.target.value) || 0)}
                        className="input-filled w-full pl-10 font-mono text-xl"
                      />
                    </div>
                  </div>

                  {/* Auto Rate */}
                  <div>
                    <label className="block text-sm text-text-dark mb-2">
                      Auto Rate (Rs/km)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">Rs</span>
                      <input
                        type="number"
                        value={autoRate}
                        onChange={(e) => setAutoRate(parseInt(e.target.value) || 0)}
                        className="input-filled w-full pl-10 font-mono text-xl"
                      />
                    </div>
                  </div>

                  {/* Ola Rate */}
                  <div>
                    <label className="block text-sm text-text-dark mb-2">
                      Ola Rate (Rs/km)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">Rs</span>
                      <input
                        type="number"
                        value={olaRate}
                        onChange={(e) => setOlaRate(parseInt(e.target.value) || 0)}
                        className="input-filled w-full pl-10 font-mono text-xl"
                      />
                    </div>
                  </div>

                  {/* Uber Rate */}
                  <div>
                    <label className="block text-sm text-text-dark mb-2">
                      Uber Rate (Rs/km)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">Rs</span>
                      <input
                        type="number"
                        value={uberRate}
                        onChange={(e) => setUberRate(parseInt(e.target.value) || 0)}
                        className="input-filled w-full pl-10 font-mono text-xl"
                      />
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary mt-8 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Pricing
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="font-syne font-bold text-2xl text-text-light mb-6">
                Branding Editor
              </h2>

              <div className="card">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Logo URL */}
                  <div>
                    <label className="block text-sm text-text-dark mb-2">
                      Logo URL
                    </label>
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="input-filled w-full"
                    />
                    <p className="text-xs text-muted mt-1">
                      Leave empty to use default BuddyRide logo
                    </p>
                  </div>

                  {/* Primary Color */}
                  <div>
                    <label className="block text-sm text-text-dark mb-2">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-12 h-12 rounded-lg border-2 border-teal cursor-pointer"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="input-filled flex-1 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-8 pt-6 border-t border-teal/20">
                  <p className="text-sm text-muted mb-4">Preview</p>
                  <div className="p-6 bg-bg rounded-xl">
                    <div
                      className="w-32 h-12 rounded-lg flex items-center justify-center text-text-dark font-syne font-bold"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-8" />
                      ) : (
                        'BuddyRide'
                      )}
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary mt-6 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Branding
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Navbar Tab */}
          {activeTab === 'navbar' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="font-syne font-bold text-2xl text-text-light mb-6">
                Navbar Configuration
              </h2>

              <div className="card">
                <p className="text-muted text-sm mb-6">
                  Edit navigation links. JSON format:
                </p>

                <pre className="bg-bg p-4 rounded-xl text-text-light font-mono text-sm overflow-x-auto">
                  {JSON.stringify([
                    { label: 'Find a Ride', path: '/guest/find' },
                    { label: 'Offer a Ride', path: '/host/offer' },
                  ], null, 2)}
                </pre>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary mt-6 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Navbar Config
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="font-syne font-bold text-2xl text-text-light mb-6">
                Subscriptions
              </h2>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button className="px-4 py-2 bg-primary text-text-dark text-sm rounded-full">
                  All
                </button>
                <button className="px-4 py-2 bg-teal/20 text-text-light text-sm rounded-full">
                  7-Day
                </button>
                <button className="px-4 py-2 bg-teal/20 text-text-light text-sm rounded-full">
                  15-Day
                </button>
                <button className="px-4 py-2 bg-teal/20 text-text-light text-sm rounded-full">
                  30-Day
                </button>
              </div>

              {/* Active Subscriptions */}
              <div className="card">
                <h3 className="font-syne font-semibold text-lg text-text-dark mb-4">
                  Active Subscriptions
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="text-muted text-sm">
                      <tr>
                        <th className="text-left pb-3">User</th>
                        <th className="text-left pb-3">Plan</th>
                        <th className="text-left pb-3">Start Date</th>
                        <th className="text-left pb-3">End Date</th>
                        <th className="text-left pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-text-dark text-sm">
                      <tr className="border-t border-teal/10">
                        <td className="py-3">Rahul Sharma</td>
                        <td>15-Day</td>
                        <td>May 15, 2026</td>
                        <td>May 30, 2026</td>
                        <td className="text-green-500">Active</td>
                      </tr>
                      <tr className="border-t border-teal/10">
                        <td className="py-3">Priya Patel</td>
                        <td>30-Day</td>
                        <td>May 20, 2026</td>
                        <td>Jun 19, 2026</td>
                        <td className="text-green-500">Active</td>
                      </tr>
                      <tr className="border-t border-teal/10">
                        <td className="py-3">Vikram Singh</td>
                        <td>7-Day</td>
                        <td>May 28, 2026</td>
                        <td>Jun 4, 2026</td>
                        <td className="text-orange-400">Expiring</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
