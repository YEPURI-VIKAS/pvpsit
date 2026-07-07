import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  DoorOpen, 
  Wrench, 
  Monitor, 
  CalendarClock, 
  LogOut,
  Bell,
  Search,
  UserCircle,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Facilities', path: '/facilities', icon: DoorOpen },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench },
    { name: 'Assets', path: '/assets', icon: Monitor },
    { name: 'Bookings', path: '/bookings', icon: CalendarClock },
  ];

  return (
    <div className={`flex flex-col w-64 bg-[#1E3A8A] text-white h-screen fixed left-0 top-0 shadow-2xl z-40 transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-6 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="bg-white p-2 rounded-xl text-[#1E3A8A]">
            <DoorOpen size={24} />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg leading-tight">PVPSIT</h1>
            <p className="text-xs text-blue-200">Facility Manager</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-white md:hidden"
        >
          <X size={20} />
        </button>
      </div>
      
      <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-white text-[#1E3A8A] shadow-md font-semibold' 
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 w-full text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

interface NotificationItem {
  id: number;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
}

const Header = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ title: string; desc: string } | null>(null);
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Ref always pointing to the latest addNotification (avoids stale closures in async effects)
  const addNotifRef = useRef<(title: string, desc: string) => void>(() => {});

  const [showResults, setShowResults] = useState(false);
  const [dbData, setDbData] = useState<{
    facilities: any[];
    assets: any[];
    tickets: any[];
  }>({ facilities: [], assets: [], tickets: [] });

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowResults(false);
      }
      if (!target.closest('.notification-container')) {
        setShowNotifications(false);
      }
      if (!target.closest('.profile-container')) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const fetchSearchData = async () => {
    try {
      const [facRes, assetRes, ticketRes] = await Promise.all([
        api.get<any[]>('/facilities'),
        api.get<any[]>('/assets'),
        api.get<any[]>('/tickets')
      ]);
      setDbData({
        facilities: facRes || [],
        assets: assetRes || [],
        tickets: ticketRes || []
      });
    } catch (e) {
      console.error('Error fetching global search data:', e);
    }
  };

  const handleResultClick = (path: string) => {
    setShowResults(false);
    setSearchQuery('');
    navigate(path);
  };

  const query = searchQuery.toLowerCase().trim();
  const filteredData = {
    facilities: dbData.facilities.filter(f => 
      f.name.toLowerCase().includes(query) || 
      f.id.toLowerCase().includes(query) || 
      f.type.toLowerCase().includes(query)
    ),
    assets: dbData.assets.filter(a => 
      a.name.toLowerCase().includes(query) || 
      a.id.toLowerCase().includes(query) || 
      a.category.toLowerCase().includes(query) ||
      a.location.toLowerCase().includes(query)
    ),
    tickets: dbData.tickets.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.id.toLowerCase().includes(query) || 
      t.location.toLowerCase().includes(query)
    )
  };

  // KEY includes role so admin and student with same email never share a notification bucket
  const notificationKey = `pvpsit_notifications_${user?.email}_${user?.user_metadata?.role || 'guest'}`;

  // Unified save: syncs BOTH user-specific key AND generic key (Dashboard reads generic)
  const saveNotifs = (notifs: NotificationItem[]) => {
    localStorage.setItem(notificationKey, JSON.stringify(notifs));
    localStorage.setItem('pvpsit_notifications', JSON.stringify(notifs));
    window.dispatchEvent(new Event('pvpsit_notifications_updated'));
  };

  // Keep addNotifRef current every render so polling/WS never use stale closures
  useEffect(() => {
    addNotifRef.current = (title: string, desc: string) => {
      // Read fresh from localStorage to avoid stale closure issues
      const existing: NotificationItem[] = JSON.parse(localStorage.getItem(notificationKey) || '[]');
      // Deduplicate: skip if same title+desc exists in last 10 items
      const isDup = existing.slice(0, 10).some(n => n.title === title && n.desc === desc);
      if (isDup) return;
      const newNotif: NotificationItem = { id: Date.now(), title, desc, time: 'Just now', unread: true };
      const newNotifs = [newNotif, ...existing];
      // Write to localStorage FIRST, then update state
      localStorage.setItem(notificationKey, JSON.stringify(newNotifs));
      localStorage.setItem('pvpsit_notifications', JSON.stringify(newNotifs));
      window.dispatchEvent(new Event('pvpsit_notifications_updated'));
      // Update React state directly (no cascade)
      setNotifications(newNotifs);
      // Show toast
      setToast({ title, desc });
      setTimeout(() => setToast(null), 4000);
    };
  });

  // Load notifications on mount / when user changes (role-specific key)
  useEffect(() => {
    const saved = localStorage.getItem(notificationKey);
    try { setNotifications(saved ? JSON.parse(saved) : []); } catch (e) { setNotifications([]); }
  }, [notificationKey]);

  // Sync from other components / tabs (single listener, correct key)
  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem(notificationKey);
      if (saved) { try { setNotifications(JSON.parse(saved)); } catch (e) {} }
    };
    window.addEventListener('pvpsit_notifications_updated', handleSync);
    return () => window.removeEventListener('pvpsit_notifications_updated', handleSync);
  }, [notificationKey]);

  // Admin polling: detect new Pending bookings every 15s (fallback when WS is missed)
  useEffect(() => {
    const isAdminUser = user?.user_metadata?.role === 'Admin';
    if (!isAdminUser) return;

    let knownPendingIds = new Set<string | number>();
    let isFirst = true;

    const checkNewBookings = async () => {
      try {
        const bookings = await api.get<any[]>('/bookings');
        const pending = bookings.filter(b => b.status === 'Pending');

        if (!isFirst) {
          pending.forEach(b => {
            if (!knownPendingIds.has(b.id)) {
              addNotifRef.current(
                'New Booking Request',
                `A new booking request has been submitted for ${b.location}.`
              );
            }
          });
        }

        knownPendingIds = new Set(pending.map(b => b.id));
        isFirst = false;
      } catch (e) {}
    };

    checkNewBookings();
    const iv = setInterval(checkNewBookings, 15000);
    return () => clearInterval(iv);
  }, [user?.user_metadata?.role]);

  // Supabase Realtime - live notifications (replaces WebSocket)
  useEffect(() => {
    if (!user?.email) return;
    const isAdmin = user?.user_metadata?.role === "Admin";
    const channelName = "live-" + user.email + "-" + (user?.user_metadata?.role || "guest");
    const ch = supabase.channel(channelName);
    if (isAdmin) {
      ch
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, (payload: any) => {
          addNotifRef.current("New Booking Request",
            "New booking at " + payload.new.location + " submitted by " + payload.new.organizer + ".");
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "maintenance_tickets" }, (payload: any) => {
          addNotifRef.current("New Maintenance Request",
            "Issue at " + payload.new.location + " - Priority: " + payload.new.priority + ".");
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "assets" }, (payload: any) => {
          addNotifRef.current("New Asset Registered",
            "Asset " + payload.new.name + " (" + payload.new.category + ") added to inventory.");
        });
    } else {
      ch
        .on("postgres_changes", {
          event: "UPDATE", schema: "public", table: "bookings",
          filter: "organizer_email=eq." + user.email,
        }, (payload: any) => {
          const s = payload.new.status;
          const loc = payload.new.location;
          if (payload.old.status === s) return;
          if (s === "Confirmed") {
            addNotifRef.current("Booking Confirmed", "Your booking at " + loc + " has been confirmed!");
          } else if (s === "Rejected" || s === "Cancelled") {
            addNotifRef.current("Booking Rejected", "Your booking at " + loc + " was rejected.");
          } else {
            addNotifRef.current("Booking " + s, "Your booking at " + loc + " is now " + s.toLowerCase() + ".");
          }
        })
        .on("postgres_changes", {
          event: "UPDATE", schema: "public", table: "maintenance_tickets",
        }, (payload: any) => {
          if (payload.old.status === payload.new.status) return;
          addNotifRef.current("Maintenance Update",
            "Ticket is now " + payload.new.status + ".");
        });
    }
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.email, user?.user_metadata?.role]);
  const handleMarkAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, unread: false }));
    setNotifications(updated);
    saveNotifs(updated);
  };

  const handleNotificationClick = (id: number) => {
    const clicked = notifications.find(n => n.id === id);
    const updated = notifications.map(n => n.id === id ? { ...n, unread: false } : n);
    setNotifications(updated);
    saveNotifs(updated);
    setShowNotifications(false);
    if (clicked) {
      const t = clicked.title.toLowerCase();
      if (t.includes('booking') || t.includes('booked') || t.includes('approval') || t.includes('approved') || t.includes('confirmed') || t.includes('rejected')) {
        navigate('/bookings');
      } else if (t.includes('maintenance') || t.includes('ticket') || t.includes('repaired')) {
        navigate('/maintenance');
      } else if (t.includes('asset') || t.includes('inventory') || t.includes('removed') || t.includes('deleted')) {
        navigate('/assets');
      } else if (t.includes('facility') || t.includes('classroom')) {
        navigate('/facilities');
      }
    }
  };

  const handleToastClick = () => {
    if (!toast) return;
    const t = toast.title.toLowerCase();
    setToast(null);
    if (t.includes('booking') || t.includes('booked') || t.includes('approval') || t.includes('approved') || t.includes('confirmed') || t.includes('rejected')) {
      navigate('/bookings');
    } else if (t.includes('maintenance') || t.includes('ticket') || t.includes('repaired') || t.includes('status updated')) {
      navigate('/maintenance');
    } else if (t.includes('asset') || t.includes('inventory') || t.includes('removed') || t.includes('deleted')) {
      navigate('/assets');
    } else if (t.includes('facility') || t.includes('classroom')) {
      navigate('/facilities');
    }
  };

  // Extract name from metadata if it exists, otherwise use email
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin User';
  const role = user?.user_metadata?.role || 'Faculty / Staff';

  return (
    <>
      {toast && (
        <div 
          onClick={handleToastClick}
          className="fixed top-6 right-6 bg-white text-gray-900 px-5 py-4 rounded-2xl border border-gray-100 hover:border-blue-300 shadow-2xl animate-in slide-in-from-right fade-in duration-300 flex items-start z-50 max-w-sm cursor-pointer transition-all hover:scale-[1.02]"
        >
          <div className="w-2.5 h-2.5 bg-blue-600 rounded-full mr-3.5 mt-1.5 shrink-0 animate-ping"></div>
          <div className="flex-1">
            <h4 className="font-bold text-sm text-gray-900">{toast.title}</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{toast.desc}</p>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setToast(null);
            }} 
            className="ml-4 text-gray-400 hover:text-gray-600 font-semibold text-sm cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
      <div className="flex items-center space-x-2 flex-1 max-w-xl mr-4 relative search-container">
        <button 
          type="button" 
          onClick={onMenuClick}
          className="p-2 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 md:hidden focus:outline-none shrink-0"
        >
          <Menu size={24} />
        </button>
        <div className="flex-1 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1E3A8A] transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search facilities, assets, or maintenance tickets..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => {
              fetchSearchData();
              setShowResults(true);
            }}
            className="w-full bg-gray-100 border-transparent focus:bg-white focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/20 rounded-xl py-2.5 pl-10 pr-4 text-sm transition-all duration-300 outline-none"
          />
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchQuery.trim() !== '' && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[400px] overflow-y-auto custom-scrollbar">
            {/* Facilities Results */}
            {filteredData.facilities.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Facilities</div>
                {filteredData.facilities.map(facility => (
                  <div 
                    key={facility.id} 
                    onClick={() => handleResultClick('/facilities')}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-50 p-1.5 rounded-lg text-[#1E3A8A]"><DoorOpen size={16} /></div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{facility.name}</p>
                        <p className="text-xs text-gray-500">Room {facility.id} • {facility.type}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{facility.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Assets Results */}
            {filteredData.assets.length > 0 && (
              <div className="p-2 border-t border-gray-50">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assets</div>
                {filteredData.assets.map(asset => (
                  <div 
                    key={asset.id} 
                    onClick={() => handleResultClick('/assets')}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-600"><Monitor size={16} /></div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{asset.name}</p>
                        <p className="text-xs text-gray-500">{asset.id} • {asset.category} • {asset.location}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{asset.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tickets Results */}
            {filteredData.tickets.length > 0 && (
              <div className="p-2 border-t border-gray-50">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Maintenance Tickets</div>
                {filteredData.tickets.map(ticket => (
                  <div 
                    key={ticket.id} 
                    onClick={() => handleResultClick('/maintenance')}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-amber-50 p-1.5 rounded-lg text-amber-600"><Wrench size={16} /></div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{ticket.title}</p>
                        <p className="text-xs text-gray-500">{ticket.id} • {ticket.location} • {ticket.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{ticket.priority}</span>
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{ticket.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredData.facilities.length === 0 && filteredData.assets.length === 0 && filteredData.tickets.length === 0 && (
              <div className="p-6 text-center text-gray-500 text-sm">
                No matching results found for "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Notification Bell with Dropdown */}
        <div className="relative notification-container">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2 rounded-full transition-all ${showNotifications ? 'bg-blue-100 text-[#1E3A8A]' : 'text-gray-500 hover:text-[#1E3A8A] hover:bg-blue-50'}`}
          >
            <Bell size={20} />
            {notifications.some(n => n.unread) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>

          {/* Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900">Notifications</h3>
                  {notifications.filter(n => n.unread).length > 0 && (
                    <span className="bg-[#1E3A8A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {notifications.filter(n => n.unread).length} new
                    </span>
                  )}
                </div>
                <button 
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-[#1E3A8A] hover:underline font-medium disabled:opacity-40"
                  disabled={notifications.length === 0}
                >
                  Mark all as read
                </button>
              </div>
              <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                    <div className="bg-gray-50 p-3 rounded-full mb-3">
                      <Bell size={22} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500">You're all caught up!</p>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      Notifications for your bookings and updates will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.slice(0, 5).map(notification => (
                    <div 
                      key={notification.id} 
                      onClick={() => handleNotificationClick(notification.id)}
                      className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${notification.unread ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm font-semibold leading-snug ${notification.unread ? 'text-gray-900' : 'text-gray-600'}`}>
                          {notification.title}
                        </h4>
                        {notification.unread && <span className="w-2 h-2 bg-[#1E3A8A] rounded-full mt-1.5 shrink-0 ml-2"></span>}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{notification.desc}</p>
                      <span className="text-[10px] text-gray-400 mt-1.5 block">{notification.time}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-gray-100 bg-gray-50/50 text-center">
                <button 
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/notifications');
                  }}
                  className="text-sm font-medium text-[#1E3A8A] hover:text-[#1E40AF] transition-colors"
                >
                  View All Notifications
                  {notifications.length > 5 && (
                    <span className="ml-1 text-xs text-gray-400">({notifications.length - 5} more)</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-gray-200 mx-2"></div>
        <div className="relative profile-container">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2 text-gray-700 hover:text-[#1E3A8A] transition-colors"
          >
            <UserCircle size={28} />
            <div className="text-left hidden md:block">
              <p className="text-sm font-semibold leading-none">{displayName}</p>
              <p className="text-xs text-gray-500 mt-1">{role}</p>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
              <div className="p-2">
                <button 
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/bookings');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1E3A8A] rounded-lg transition-colors"
                >
                  My Bookings
                </button>
                <button 
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/profile');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1E3A8A] rounded-lg transition-colors"
                >
                  Profile Settings
                </button>
                {user?.user_metadata?.role === 'Admin' && (
                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/users');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1E3A8A] rounded-lg transition-colors"
                  >
                    User Management
                  </button>
                )}
                <button 
                  onClick={async () => {
                    setShowProfileMenu(false);
                    await signOut();
                    navigate('/login');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  </>
  );
};

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex">
      {/* Sidebar mobile overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/50 z-30 md:hidden animate-in fade-in duration-200"
        />
      )}
      
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

