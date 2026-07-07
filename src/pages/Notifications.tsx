import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bell, Trash2, CheckSquare, Search, Calendar, Wrench, Monitor,
  ShieldAlert, ChevronLeft, ChevronRight, Square, CheckCheck, Filter,
} from 'lucide-react';

interface NotificationItem {
  id: number;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
}

type Category = 'all' | 'booking' | 'maintenance' | 'asset' | 'system';

const CATEGORIES: { key: Category; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: 'bg-gray-100 text-gray-700' },
  { key: 'booking', label: 'Bookings', color: 'bg-blue-100 text-blue-700' },
  { key: 'maintenance', label: 'Maintenance', color: 'bg-amber-100 text-amber-700' },
  { key: 'asset', label: 'Assets', color: 'bg-emerald-100 text-emerald-700' },
  { key: 'system', label: 'System', color: 'bg-purple-100 text-purple-700' },
];

const getCategory = (title: string): Category => {
  const t = title.toLowerCase();
  if (t.includes('booking') || t.includes('booked') || t.includes('approval') || t.includes('approved') || t.includes('confirmed')) return 'booking';
  if (t.includes('maintenance') || t.includes('ticket') || t.includes('repaired')) return 'maintenance';
  if (t.includes('asset') || t.includes('inventory') || t.includes('removed') || t.includes('deleted')) return 'asset';
  return 'system';
};

const getCategoryStyle = (cat: Category) => {
  switch (cat) {
    case 'booking': return { border: 'border-l-blue-500', bg: 'bg-blue-50', iconColor: 'text-blue-500' };
    case 'maintenance': return { border: 'border-l-amber-500', bg: 'bg-amber-50', iconColor: 'text-amber-500' };
    case 'asset': return { border: 'border-l-emerald-500', bg: 'bg-emerald-50', iconColor: 'text-emerald-500' };
    case 'system': return { border: 'border-l-purple-500', bg: 'bg-purple-50', iconColor: 'text-purple-500' };
    default: return { border: 'border-l-gray-300', bg: 'bg-gray-50', iconColor: 'text-gray-500' };
  }
};

const getCategoryIcon = (cat: Category) => {
  switch (cat) {
    case 'booking': return Calendar;
    case 'maintenance': return Wrench;
    case 'asset': return Monitor;
    case 'system': return ShieldAlert;
    default: return Bell;
  }
};

const ITEMS_PER_PAGE = 10;

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const notificationKey = `pvpsit_notifications_${user?.email}_${user?.user_metadata?.role || 'guest'}`;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const loadNotifications = () => {
    const saved = localStorage.getItem(notificationKey);
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load notifications:', e);
      }
    } else {
      setNotifications([]);
    }
  };

  useEffect(() => {
    loadNotifications();
    const handleSync = () => loadNotifications();
    window.addEventListener('pvpsit_notifications_updated', handleSync);
    return () => window.removeEventListener('pvpsit_notifications_updated', handleSync);
  }, [notificationKey]);

  const saveNotifications = (updated: NotificationItem[]) => {
    setNotifications(updated);
    localStorage.setItem(notificationKey, JSON.stringify(updated));
    window.dispatchEvent(new Event('pvpsit_notifications_updated'));
  };

  // Filtering
  const filtered = useMemo(() => {
    return notifications.filter(n => {
      // Category filter
      if (activeCategory !== 'all' && getCategory(n.title) !== activeCategory) return false;
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !n.desc.toLowerCase().includes(q)) return false;
      }
      // Date range filter (basic string comparison on the time field)
      // Since time is a relative string ("10 mins ago"), we skip date filtering if the time isn't parseable as a date
      if (dateFrom || dateTo) {
        const parsed = Date.parse(n.time);
        if (!isNaN(parsed)) {
          const d = new Date(parsed);
          if (dateFrom && d < new Date(dateFrom)) return false;
          if (dateTo) {
            const toEnd = new Date(dateTo);
            toEnd.setHours(23, 59, 59, 999);
            if (d > toEnd) return false;
          }
        }
      }
      return true;
    });
  }, [notifications, activeCategory, searchQuery, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [activeCategory, searchQuery, dateFrom, dateTo]);

  // Stats
  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => n.unread).length;
  const todayCount = notifications.filter(n => {
    const t = n.time?.toLowerCase() || '';
    return t.includes('min') || t.includes('hour') || t.includes('just') || t.includes('sec');
  }).length;

  // Actions
  const handleMarkAsRead = (id: number) => {
    saveNotifications(notifications.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const handleDelete = (id: number) => {
    saveNotifications(notifications.filter(n => n.id !== id));
    setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const handleNotificationClick = (id: number, title: string) => {
    handleMarkAsRead(id);
    const t = title.toLowerCase();
    if (t.includes('booking') || t.includes('booked') || t.includes('approval') || t.includes('approved') || t.includes('confirmed')) {
      navigate('/bookings', { state: { tab: 'pending' } });
    } else if (t.includes('maintenance') || t.includes('ticket') || t.includes('repaired')) {
      navigate('/maintenance');
    } else if (t.includes('asset') || t.includes('inventory')) {
      navigate('/assets');
    } else if (t.includes('facility') || t.includes('classroom')) {
      navigate('/facilities');
    }
  };

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedIds.size === paged.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paged.map(n => n.id)));
    }
  };

  const handleMarkSelectedRead = () => {
    const updated = notifications.map(n => selectedIds.has(n.id) ? { ...n, unread: false } : n);
    saveNotifications(updated);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    const updated = notifications.filter(n => !selectedIds.has(n.id));
    saveNotifications(updated);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const handleMarkAllAsRead = () => {
    saveNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all notification history?')) {
      saveNotifications([]);
    }
  };

  const allPageSelected = paged.length > 0 && selectedIds.size === paged.length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Notifications Hub</h1>
          <p className="text-gray-500 mt-1 font-medium">Review alerts, booking approvals, and system logs.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleMarkAllAsRead}
            disabled={notifications.length === 0}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckSquare size={16} />
            <span>Mark all read</span>
          </button>
          <button
            onClick={handleClearAll}
            disabled={notifications.length === 0}
            className="flex items-center space-x-2 px-4 py-2 border border-red-100 bg-red-50/50 hover:bg-red-50 rounded-xl text-sm font-medium text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            <span>Clear all</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <div className="bg-blue-50 p-2.5 rounded-xl">
            <Bell size={18} className="text-[#1E3A8A]" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total</p>
            <p className="text-xl font-extrabold text-gray-900">{totalCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <div className="bg-amber-50 p-2.5 rounded-xl">
            <Bell size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Unread</p>
            <p className="text-xl font-extrabold text-gray-900">{unreadCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <div className="bg-emerald-50 p-2.5 rounded-xl">
            <Calendar size={18} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today</p>
            <p className="text-xl font-extrabold text-gray-900">{todayCount}</p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Category Tabs + Search + Date Range */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/30 space-y-3">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === cat.key
                    ? 'bg-[#1E3A8A] text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {cat.label}
                <span className="ml-1.5 opacity-70">
                  ({cat.key === 'all' ? notifications.length : notifications.filter(n => getCategory(n.title) === cat.key).length})
                </span>
              </button>
            ))}
          </div>

          {/* Search + Date range */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/10 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400 shrink-0" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/10 transition-all"
                title="From date"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/10 transition-all"
                title="To date"
              />
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="px-4 py-2.5 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1E3A8A]">{selectedIds.size} selected</span>
            <div className="flex gap-2">
              <button
                onClick={handleMarkSelectedRead}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#1E3A8A] bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-all"
              >
                <CheckCheck size={13} /> Mark Read
              </button>
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-all"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        )}

        {/* Select All row */}
        {paged.length > 0 && (
          <div className="px-5 py-2 border-b border-gray-50 flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="p-0.5 text-gray-400 hover:text-[#1E3A8A] transition-colors"
            >
              {allPageSelected ? <CheckSquare size={16} className="text-[#1E3A8A]" /> : <Square size={16} />}
            </button>
            <span className="text-xs text-gray-400 font-medium">Select all on this page</span>
          </div>
        )}

        {/* Notifications List */}
        {paged.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {paged.map((item) => {
              const cat = getCategory(item.title);
              const style = getCategoryStyle(cat);
              const Icon = getCategoryIcon(cat);
              const isSelected = selectedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`p-5 flex items-start justify-between gap-4 hover:bg-gray-50/50 transition-colors cursor-pointer relative group border-l-4 ${style.border} ${
                    item.unread ? 'bg-blue-50/10' : ''
                  } ${isSelected ? 'bg-blue-50/30' : ''}`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                    className="p-0.5 text-gray-400 hover:text-[#1E3A8A] transition-colors mt-1 shrink-0"
                  >
                    {isSelected ? <CheckSquare size={16} className="text-[#1E3A8A]" /> : <Square size={16} />}
                  </button>

                  {/* Content */}
                  <div
                    className="flex items-start space-x-4 flex-1 min-w-0"
                    onClick={() => handleNotificationClick(item.id, item.title)}
                  >
                    <div className={`${style.bg} p-2.5 rounded-xl mt-0.5 shrink-0`}>
                      <Icon className={style.iconColor} size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-semibold text-sm ${item.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                          {item.title}
                        </h3>
                        {item.unread && (
                          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">New</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-2xl truncate">{item.desc}</p>
                      <span className="text-[10px] text-gray-400 mt-2 block font-medium">{item.time}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                    {item.unread && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkAsRead(item.id); }}
                        className="p-2 text-gray-400 hover:text-[#1E3A8A] rounded-lg hover:bg-blue-50 transition-all"
                        title="Mark as read"
                      >
                        <CheckCheck size={16} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                      title="Delete Notification"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center">
            <div className="inline-flex bg-gray-50 p-4 rounded-full text-gray-400 mb-4">
              <Bell size={32} />
            </div>
            <h3 className="font-bold text-gray-900 text-base">No notifications found</h3>
            <p className="text-gray-500 text-xs mt-1 max-w-xs mx-auto">
              {searchQuery || activeCategory !== 'all' || dateFrom || dateTo
                ? 'No alerts matched your filters.'
                : 'You have caught up with all notifications.'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > ITEMS_PER_PAGE && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
            <p className="text-xs text-gray-500 font-medium">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="text-xs font-bold text-gray-700 px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
