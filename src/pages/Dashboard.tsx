import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, DoorOpen, Wrench, AlertTriangle, ArrowUpRight, ArrowDownRight, Clock, Monitor } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md border border-gray-150 p-4 rounded-xl shadow-xl animate-in fade-in duration-200">
        <p className="font-heading font-bold text-gray-900 text-sm">{label}</p>
        <p className="font-sans font-semibold text-blue-600 text-xs mt-1">
          Usage: <span className="text-gray-900">{payload[0].value} mins</span>
        </p>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setReportGenerated(false);
    
    setTimeout(() => {
      // Generate CSV content
      const headers = ['Metric', 'Value', 'Status / Detail'];
      const statsRows = stats.map(s => `"${s.title}","${s.value}","${s.change}"`).join('\n');
      
      const activityHeaders = ['ID', 'Activity', 'Time', 'Type'];
      const activityRows = recentActivities.map(a => `"${a.id}","${a.text}","${a.time}","${a.type}"`).join('\n');
      
      const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(',') + '\n' + statsRows + '\n\n'
        + activityHeaders.join(',') + '\n' + activityRows;
        
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `facility_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsGenerating(false);
      setReportGenerated(true);
      setTimeout(() => setReportGenerated(false), 3000);
    }, 1000);
  };

  const [stats, setStats] = useState([
    { title: 'Available Facilities', value: '--', change: 'Calculating...', trend: 'neutral', icon: DoorOpen, color: 'from-blue-500 to-indigo-600', path: '/facilities' },
    { title: 'Active Maintenance', value: '--', change: 'Calculating...', trend: 'neutral', icon: Wrench, color: 'from-amber-500 to-orange-600', path: '/maintenance' },
    { title: 'Total Assets', value: '--', change: 'Calculating...', trend: 'neutral', icon: Users, color: 'from-emerald-500 to-teal-600', path: '/assets' },
    { title: 'Critical Issues', value: '--', change: 'Calculating...', trend: 'neutral', icon: AlertTriangle, color: 'from-rose-500 to-red-600', path: '/maintenance' },
  ]);

  const [activityData, setActivityData] = useState([
    { name: 'Mon', usage: 0 },
    { name: 'Tue', usage: 0 },
    { name: 'Wed', usage: 0 },
    { name: 'Thu', usage: 0 },
    { name: 'Fri', usage: 0 },
    { name: 'Sat', usage: 0 },
    { name: 'Sun', usage: 0 },
  ]);

  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<'This Week' | 'Last Week'>('This Week');

  const fetchDashboardStats = async () => {
    try {
      const [facilities, tickets, assets, bookings] = await Promise.all([
        api.get<any[]>('/facilities'),
        api.get<any[]>('/tickets'),
        api.get<any[]>('/assets'),
        api.get<any[]>('/bookings')
      ]);

      // 1. Available Facilities Calculation
      const availableFacilities = facilities.filter(f => f.status === 'Available').length;
      const totalFacilities = facilities.length;
      const facilityRatio = totalFacilities > 0 ? Math.round((availableFacilities / totalFacilities) * 100) : 0;

      // 2. Active Maintenance Calculation
      const activeMaintenance = tickets.filter(t => t.status !== 'Completed' && t.status !== 'Resolved').length;
      const totalTickets = tickets.length;
      const completedTickets = tickets.filter(t => t.status === 'Completed' || t.status === 'Resolved').length;
      const resolutionRate = totalTickets > 0 ? Math.round((completedTickets / totalTickets) * 100) : 0;

      // 3. Total Assets Calculation
      const totalAssets = assets.length;
      const activeAssets = assets.filter(a => a.status === 'Active').length;
      const inactiveAssets = totalAssets - activeAssets;

      // 4. Critical Issues Calculation
      const criticalIssues = tickets.filter(t => t.priority === 'High' && t.status !== 'Completed' && t.status !== 'Resolved').length;

      setStats([
        { 
          title: 'Available Facilities', 
          value: `${availableFacilities} / ${totalFacilities}`, 
          change: `${facilityRatio}% of Rooms Ready`, 
          trend: facilityRatio >= 80 ? 'up' : facilityRatio >= 50 ? 'neutral' : 'down', 
          icon: DoorOpen, 
          color: 'from-blue-500 to-indigo-600',
          path: '/facilities'
        },
        { 
          title: 'Active Maintenance', 
          value: activeMaintenance.toString(), 
          change: `${resolutionRate}% Resolution Rate`, 
          trend: activeMaintenance === 0 ? 'up' : 'down', 
          icon: Wrench, 
          color: 'from-amber-500 to-orange-600',
          path: '/maintenance'
        },
        { 
          title: 'Total Assets', 
          value: totalAssets.toString(), 
          change: `${activeAssets} Active / ${inactiveAssets} In Repair`, 
          trend: inactiveAssets === 0 ? 'up' : 'down', 
          icon: Users, 
          color: 'from-emerald-500 to-teal-600',
          path: '/assets'
        },
        { 
          title: 'Critical Issues', 
          value: criticalIssues.toString(), 
          change: criticalIssues > 0 ? 'Action Required' : 'All Clear', 
          trend: criticalIssues > 0 ? 'down' : 'up', 
          icon: AlertTriangle, 
          color: 'from-rose-500 to-red-600',
          path: '/maintenance'
        },
      ]);

      // Weekly usage — real booking minutes only (no fake baseline)
      // Calculate start of the selected week (Mon-based)
      const todayDate = new Date();
      const todayDow = todayDate.getDay(); // 0=Sun,1=Mon,...,6=Sat
      const diffToMon = todayDow === 0 ? -6 : 1 - todayDow;
      const startOfCurrentWeek = new Date(todayDate);
      startOfCurrentWeek.setDate(todayDate.getDate() + diffToMon);
      startOfCurrentWeek.setHours(0, 0, 0, 0);

      if (selectedWeek === 'Last Week') {
        startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() - 7);
      }

      const startMs = startOfCurrentWeek.getTime();
      const endMs = startMs + 7 * 24 * 60 * 60 * 1000;

      // For 'This Week', days beyond today should show 0
      const todayMidnight = new Date(todayDate);
      todayMidnight.setHours(23, 59, 59, 999);
      const todayEndMs = todayMidnight.getTime();

      // day index: 0=Mon,1=Tue,...,6=Sun
      const dailyBookingMinutes: number[] = [0, 0, 0, 0, 0, 0, 0];

      bookings.forEach(booking => {
        if (!booking.time) return;
        const match = booking.time.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) {
          const bookingDate = new Date(match[1] + 'T00:00:00');
          const bookingMs = bookingDate.getTime();
          if (bookingMs >= startMs && bookingMs < endMs) {
            // For this week, skip future days
            if (selectedWeek === 'This Week' && bookingMs > todayEndMs) return;

            // Convert JS day (0=Sun) to Mon-based index (0=Mon)
            const jsDow = bookingDate.getDay();
            const monIdx = jsDow === 0 ? 6 : jsDow - 1;

            let duration = 60; // default 1 hour
            const rangeMatch = booking.time.match(/(\d{1,2}):(\d{2})\s*([AP]M)\s*-\s*(\d{1,2}):(\d{2})\s*([AP]M)/i);
            if (rangeMatch) {
              let sh = parseInt(rangeMatch[1]);
              const sm = parseInt(rangeMatch[2]);
              const sampm = rangeMatch[3].toUpperCase();
              let eh = parseInt(rangeMatch[4]);
              const em = parseInt(rangeMatch[5]);
              const eampm = rangeMatch[6].toUpperCase();
              if (sampm === 'PM' && sh < 12) sh += 12;
              if (sampm === 'AM' && sh === 12) sh = 0;
              if (eampm === 'PM' && eh < 12) eh += 12;
              if (eampm === 'AM' && eh === 12) eh = 0;
              duration = Math.max(30, (eh * 60 + em) - (sh * 60 + sm));
            }
            dailyBookingMinutes[monIdx] += duration;
          }
        }
      });

      const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const newChartData = dayLabels.map((label, i) => ({
        name: label,
        usage: dailyBookingMinutes[i],
      }));

      setActivityData(newChartData);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const loadNotifications = () => {
    const saved = localStorage.getItem('pvpsit_notifications');
    let activities = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Remove duplicates by both id and content
        const seenIds = new Set();
        const seenContent = new Set();
        const uniqueParsed = parsed.filter((item: any) => {
          const contentKey = `${item.title.trim()}-${item.desc.trim()}`;
          if (seenIds.has(item.id) || seenContent.has(contentKey)) return false;
          seenIds.add(item.id);
          seenContent.add(contentKey);
          return true;
        });

        activities = uniqueParsed.map((item: any, i: number) => {
          let type = 'system';
          const title = item.title.toLowerCase();
          if (title.includes('maintenance') || title.includes('ticket')) {
            type = 'maintenance';
          } else if (title.includes('booking') || title.includes('approved') || title.includes('confirmed')) {
            type = 'booking';
          } else if (title.includes('asset') || title.includes('projector') || title.includes('ac')) {
            type = 'asset';
          }
          return {
            id: `${item.id}_${i}`,
            text: `${item.title}: ${item.desc}`,
            time: item.time,
            type: type
          };
        });
      } catch (e) {
        console.error(e);
      }
    }
    
    if (activities.length === 0) {
      activities = [
        { id: 1, text: 'Projector fixed in Room 204', time: '10 mins ago', type: 'maintenance' },
        { id: 2, text: 'Seminar Hall booked for Guest Lecture', time: '1 hour ago', type: 'booking' },
        { id: 3, text: 'New AC unit installed in CSE Lab 1', time: '3 hours ago', type: 'asset' },
        { id: 4, text: 'Routine inspection completed in Main Block', time: '5 hours ago', type: 'maintenance' },
      ];
    }
    setRecentActivities(activities.slice(0, 4));
  };

  useEffect(() => {
    // Initial fetch
    fetchDashboardStats();
    loadNotifications();

    // Live polling every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardStats();
      loadNotifications();
    }, 30000);

    // Listen to real-time updates triggered by WebSocket sync
    const handleSync = () => {
      fetchDashboardStats();
      loadNotifications();
    };

    window.addEventListener('pvpsit_notifications_updated', handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('pvpsit_notifications_updated', handleSync);
    };
  }, [selectedWeek]);

  return (
    <div className="space-y-8 relative">
      {/* Toast Notification */}
      {reportGenerated && (
        <div className="fixed top-24 right-8 bg-green-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="w-2 h-2 bg-white rounded-full mr-3 animate-ping"></div>
          <span className="font-semibold text-sm">Monthly Report generated successfully!</span>
        </div>
      )}

      {/* Header Panel with soft glow */}
      <div className="flex justify-between items-end mb-4 p-6 bg-white/40 backdrop-blur-md border border-white/40 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight font-heading">Dashboard</h1>
          <p className="text-gray-500 mt-1.5 font-medium">Welcome back. Here's what's happening on campus today.</p>
        </div>
        <button 
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-5 py-2.5 rounded-2xl font-bold hover:shadow-lg hover:shadow-blue-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center min-w-[150px] justify-center cursor-pointer shadow-md"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
              Generating...
            </>
          ) : (
            'Generate Report'
          )}
        </button>
      </div>

      {/* Stats Grid with dynamic glowing designs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const isCriticalActive = stat.title === 'Critical Issues' && stat.value !== '0';
          return (
            <div 
              key={index} 
              onClick={() => {
                if (stat.title === 'Critical Issues') {
                  navigate(stat.path, { state: { priorityFilter: 'High' } });
                } else {
                  navigate(stat.path);
                }
              }}
              className={`bg-white p-6 rounded-3xl shadow-sm border border-gray-100/80 hover:border-blue-200/50 hover:shadow-xl transition-all duration-300 ease-out hover-lift group relative overflow-hidden cursor-pointer`}
            >
              {/* Subtle background card glow */}
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-full group-hover:scale-125 transition-transform duration-500 -z-10"></div>
              
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 font-heading">{stat.title}</p>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight font-heading">{stat.value}</h3>
                    {isCriticalActive && (
                      <span className="flex h-3.5 w-3.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600"></span>
                      </span>
                    )}
                  </div>
                </div>
                <div className={`bg-gradient-to-br ${stat.color} p-3 rounded-2xl text-white shadow-md transform group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon size={22} className="group-hover:rotate-6 transition-transform duration-300" />
                </div>
              </div>
              
              <div className="mt-5 pt-3 border-t border-gray-50 flex items-center text-xs font-semibold text-gray-500">
                <span className={`flex items-center font-bold mr-1.5 ${
                  stat.trend === 'up' ? 'text-emerald-600' : stat.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {stat.trend === 'up' ? <ArrowUpRight size={14} className="mr-0.5" /> : stat.trend === 'down' ? <ArrowDownRight size={14} className="mr-0.5" /> : null}
                  {stat.change}
                </span>
                <span className="text-gray-400">vs last week</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart with premium colors */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-2 hover:shadow-md transition-shadow duration-300">
          <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight font-heading">Facility Usage (Weekly)</h2>
            <select 
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value as 'This Week' | 'Last Week')}
              className="bg-gray-50 border border-gray-150 text-xs font-bold rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-blue-700/20 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <option value="This Week">This Week</option>
              <option value="Last Week">Last Week</option>
            </select>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 'bold' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 'bold' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="usage" 
                  stroke="#1E3A8A" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorUsage)" 
                  dot={{ r: 4, strokeWidth: 2, stroke: '#FFFFFF', fill: '#1E3A8A' }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#1E3A8A' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity card with clean visual indicators */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow duration-300">
          <h2 className="text-lg font-bold text-gray-900 mb-6 tracking-tight font-heading border-b border-gray-50 pb-4">Recent Activity</h2>
          <div className="space-y-6 flex-1">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, idx) => {
                const activityPath =
                  activity.type === 'maintenance' ? '/maintenance' :
                  activity.type === 'booking' ? '/bookings' :
                  activity.type === 'asset' ? '/assets' :
                  '/notifications';
                return (
                  <div
                    key={idx}
                    role="button"
                    tabIndex={0}
                    className="flex items-start group cursor-pointer rounded-2xl p-2 -mx-2 hover:bg-blue-50/40 transition-colors duration-200"
                    onClick={() => navigate(activityPath)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(activityPath)}
                  >
                    <div className={`p-2.5 rounded-2xl mr-4 transform group-hover:scale-110 transition-transform duration-300 ${
                      activity.type === 'maintenance' ? 'bg-amber-50 text-amber-600' :
                      activity.type === 'booking' ? 'bg-blue-50 text-[#1E3A8A]' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {activity.type === 'maintenance' && <Wrench size={16} />}
                      {activity.type === 'booking' && <Clock size={16} />}
                      {activity.type === 'asset' && <Monitor size={16} />}
                      {activity.type === 'system' && <Monitor size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-blue-900 transition-colors break-words">{activity.text}</p>
                      <p className="text-xs text-gray-400 mt-1 font-medium flex items-center">
                        <Clock size={10} className="mr-1" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8">
                <Clock size={32} className="mb-2 text-gray-300" />
                <p className="text-sm font-medium">No recent activities</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => navigate('/notifications')}
            className="w-full mt-6 py-3 border border-gray-200 hover:border-blue-200 rounded-2xl text-sm font-bold text-gray-600 hover:text-blue-700 hover:bg-blue-50/20 transition-all duration-200 cursor-pointer"
          >
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
