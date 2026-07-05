import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, Users, Plus, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Booking = {
  id: string | number;
  title: string;
  time: string;
  location: string;
  organizer: string;
  organizerEmail?: string;
  status: string;
};

const Bookings = () => {
  const [schedule, setSchedule] = useState<Booking[]>([]);
  const { user } = useAuth();
  const isAdmin = user?.user_metadata?.role === 'Admin';
  const [loading, setLoading] = useState(true);
  const locationState = useLocation();
  const [activeTab, setActiveTab] = useState<'schedule' | 'pending'>('schedule');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (locationState.state && (locationState.state as any).tab) {
      setActiveTab((locationState.state as any).tab);
    }
  }, [locationState.state]);

  const handleUpdateStatus = async (id: string | number, status: string) => {
    try {
      // Find the booking before updating so we have location info
      const bookingItem = schedule.find(b => b.id === id);
      
      await api.patch(`/bookings/${id}/status`, { status });
      setSchedule(prev =>
        prev.map(item => (item.id === id ? { ...item, status } : item))
      );

      // Write notification directly to the student's notification key (role-aware)
      const ownerEmail = localStorage.getItem(`pvpsit_booking_owner_${id}`);
      const ownerRole  = localStorage.getItem(`pvpsit_booking_owner_role_${id}`) || 'Student';
      if (ownerEmail && bookingItem) {
        const title = status === 'Confirmed' ? 'Booking Confirmed' :
                      status === 'Rejected'  ? 'Booking Rejected'  :
                      `Booking ${status}`;
        const desc = status === 'Confirmed'
          ? `Great news! Your booking for ${bookingItem.location} has been confirmed.`
          : status === 'Rejected'
          ? `Your booking for ${bookingItem.location} has been rejected by the admin.`
          : `Your booking for ${bookingItem.location} status changed to: ${status}.`;

        const notifKey = `pvpsit_notifications_${ownerEmail}_${ownerRole}`;
        const existing: any[] = JSON.parse(localStorage.getItem(notifKey) || '[]');
        const isDup = existing.slice(0, 5).some((n: any) => n.title === title && n.desc === desc);
        if (!isDup) {
          const newNotif = { id: Date.now(), title, desc, time: 'Just now', unread: true };
          const updated = [newNotif, ...existing];
          localStorage.setItem(notifKey, JSON.stringify(updated));
          localStorage.setItem('pvpsit_notifications', JSON.stringify(updated));
          window.dispatchEvent(new Event('pvpsit_notifications_updated'));
        }
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('Failed to update booking status.');
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await api.get<Booking[]>('/bookings');
      setSchedule(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const [currentDate, setCurrentDate] = useState(new Date());

  const getYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const currentDateString = getYYYYMMDD(currentDate);

  const getBookingDateAndDisplayTime = (timeStr: string) => {
    const dateRegex = /^(\d{4}-\d{2}-\d{2})\s+at\s+(.+)$/;
    const match = timeStr.match(dateRegex);
    if (match) {
      return {
        date: match[1],
        displayTime: match[2]
      };
    }
    return {
      date: null,
      displayTime: timeStr
    };
  };

  const handlePrevDay = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const handleNextDay = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    title: '',
    date: getYYYYMMDD(new Date()),
    startTime: '',
    endTime: '',
    location: '',
    organizer: ''
  });

  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    // Convert 24h to 12h format for display
    const formatTime = (time24: string) => {
      const [hours, minutes] = time24.split(':');
      const h = parseInt(hours);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    };

    const timeString = `${newBooking.date} at ${formatTime(newBooking.startTime)} - ${formatTime(newBooking.endTime)}`;
    
    const bookingToInsert = {
      id: `BKG-${Math.floor(Math.random() * 10000)}`,
      title: newBooking.title,
      time: timeString,
      location: newBooking.location,
      organizer: newBooking.organizer || user?.user_metadata?.full_name || 'Staff Member',
      organizerEmail: user?.email || '',
      status: 'Pending'
    };

    try {
      const saved = await api.post<Booking>('/bookings', bookingToInsert);
      setSchedule([...schedule, saved]);

      // Map booking ID → student's email+role so admin can notify them later
      const savedId = (saved as any).id || bookingToInsert.id;
      if (user?.email) {
        localStorage.setItem(`pvpsit_booking_owner_${savedId}`, user.email);
        localStorage.setItem(`pvpsit_booking_owner_role_${savedId}`, user?.user_metadata?.role || 'Student');

        // Immediately write "Booking Submitted" notification to THIS user's role-specific key
        const notifKey = `pvpsit_notifications_${user.email}_${user?.user_metadata?.role || 'Student'}`;
        const existing: any[] = JSON.parse(localStorage.getItem(notifKey) || '[]');
        const submittedNotif = {
          id: Date.now(),
          title: 'Booking Submitted',
          desc: `Your booking for ${bookingToInsert.location} has been submitted and is pending approval.`,
          time: 'Just now',
          unread: true
        };
        const updatedNotifs = [submittedNotif, ...existing];
        localStorage.setItem(notifKey, JSON.stringify(updatedNotifs));
        localStorage.setItem('pvpsit_notifications', JSON.stringify(updatedNotifs));
        window.dispatchEvent(new Event('pvpsit_notifications_updated'));
      }

      setIsModalOpen(false);
      setNewBooking({ 
        title: '', 
        date: getYYYYMMDD(currentDate),
        startTime: '', 
        endTime: '', 
        location: '', 
        organizer: '' 
      });
    } catch (error) {
      console.error('Error adding booking:', error);
      alert('Failed to add booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    const headers = ['Booking ID', 'Event Title', 'Time', 'Location', 'Organizer', 'Status'];
    const rows = schedule.map(b => `"${b.id}","${b.title}","${b.time}","${b.location}","${b.organizer}","${b.status}"`).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bookings_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings & Schedule</h1>
          <p className="text-gray-500 mt-1">Manage facility reservations and timetables.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExport}
            className="bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm flex-1 sm:flex-none justify-center"
          >
            <Download size={20} className="mr-2" />
            Export CSV
          </button>
          <button 
            onClick={() => {
              setIsSubmitting(false);
              setIsModalOpen(true);
            }}
            className="bg-[#1E3A8A] text-white px-4 py-2 rounded-xl font-medium hover:bg-[#1E40AF] transition-colors flex items-center shadow-lg shadow-blue-900/20 flex-1 sm:flex-none justify-center"
          >
            <Plus size={20} className="mr-2" />
            New Booking
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex border-b border-gray-100 mb-6">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all mr-6 ${
                  activeTab === 'schedule'
                    ? 'border-[#1E3A8A] text-[#1E3A8A]'
                    : 'border-transparent text-gray-500 hover:text-gray-950'
                }`}
              >
                Today's Schedule
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all relative ${
                  activeTab === 'pending'
                    ? 'border-[#1E3A8A] text-[#1E3A8A]'
                    : 'border-transparent text-gray-500 hover:text-gray-950'
                }`}
              >
                Pending Approvals
                {schedule.filter(s => s.status === 'Pending').length > 0 && (
                  <span className="ml-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {schedule.filter(s => s.status === 'Pending').length}
                  </span>
                )}
              </button>
            </div>

            {activeTab === 'schedule' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Schedule Calendar</h2>
                  <div className="flex items-center space-x-4">
                    <button onClick={handlePrevDay} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={20} /></button>
                    <div className="relative flex items-center space-x-1 cursor-pointer hover:text-[#1E3A8A] transition-colors">
                      <CalendarIcon size={16} className="text-gray-500" />
                      <span className="font-medium text-gray-600 relative">
                        {formatDate(currentDate)}
                        <input 
                          type="date" 
                          value={currentDateString}
                          onChange={(e) => {
                            if (e.target.value) {
                              setCurrentDate(new Date(e.target.value));
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full"
                        />
                      </span>
                    </div>
                    <button onClick={handleNextDay} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight size={20} /></button>
                  </div>
                </div>

                <div className="space-y-4">
                  {loading ? (
                    <div className="flex justify-center py-10">
                      <div className="w-8 h-8 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (() => {
                    const filteredSchedule = schedule.filter(item => {
                      const parsed = getBookingDateAndDisplayTime(item.time);
                      return parsed.date === currentDateString || (parsed.date === null && currentDateString === getYYYYMMDD(new Date()));
                    });

                    if (filteredSchedule.length === 0) {
                      return <div className="text-center py-10 text-gray-500">No bookings found for this date.</div>;
                    }

                    return filteredSchedule.map((item) => {
                      const parsed = getBookingDateAndDisplayTime(item.time);
                      const timeParts = parsed.displayTime.split(' - ');
                      const startTime = timeParts[0];
                      const endTime = timeParts[1];
                      return (
                        <div key={item.id} className="flex border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                          <div className="bg-blue-50 w-32 p-4 flex flex-col justify-center items-center text-center border-r border-gray-100 shrink-0">
                            <Clock size={20} className="text-[#1E3A8A] mb-1" />
                            <span className="text-xs font-bold text-gray-900">{startTime}</span>
                            {endTime && (
                              <>
                                <span className="text-[10px] text-gray-500">to</span>
                                <span className="text-xs font-bold text-gray-900">{endTime}</span>
                              </>
                            )}
                          </div>
                          <div className="p-4 flex-1 bg-white">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-bold text-lg text-gray-900">{item.title}</h3>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  item.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                                  item.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {item.status}
                                </span>
                                {isAdmin && item.status === 'Pending' && (
                                  <div className="flex space-x-1 shrink-0">
                                    <button 
                                      onClick={() => handleUpdateStatus(item.id, 'Confirmed')}
                                      className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                                    >
                                      Approve
                                    </button>
                                    <button 
                                      onClick={() => handleUpdateStatus(item.id, 'Rejected')}
                                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center text-sm text-gray-600 space-x-4">
                              <div className="flex items-center">
                                <CalendarIcon size={14} className="mr-1.5 text-gray-400" />
                                {item.location}
                              </div>
                              <div className="flex items-center">
                                <Users size={14} className="mr-1.5 text-gray-400" />
                                {item.organizer}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </>
            )}

            {activeTab === 'pending' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Pending Requests Queue</h2>
                {loading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (() => {
                  const pendingBookings = schedule.filter(item => item.status === 'Pending');

                  if (pendingBookings.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-500 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                        No pending booking requests found.
                      </div>
                    );
                  }

                  return pendingBookings.map((item) => {
                    const parsed = getBookingDateAndDisplayTime(item.time);
                    return (
                      <div key={item.id} className="flex border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                        <div className="bg-amber-50/50 w-32 p-4 flex flex-col justify-center items-center text-center border-r border-gray-100 shrink-0">
                          <Clock size={20} className="text-amber-600 mb-1" />
                          <span className="text-xs font-bold text-gray-900 leading-snug">{parsed.displayTime}</span>
                          {parsed.date && (
                            <span className="text-[10px] text-gray-500 mt-1 font-semibold">{parsed.date}</span>
                          )}
                        </div>
                        <div className="p-4 flex-1 bg-white flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                          <div>
                            <h3 className="font-bold text-lg text-gray-900 mb-1">{item.title}</h3>
                            <div className="flex items-center text-sm text-gray-600 space-x-4">
                              <div className="flex items-center">
                                <CalendarIcon size={14} className="mr-1.5 text-gray-400" />
                                {item.location}
                              </div>
                              <div className="flex items-center">
                                <Users size={14} className="mr-1.5 text-gray-400" />
                                {item.organizer}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
                              Pending
                            </span>
                            {isAdmin && (
                              <div className="flex space-x-1">
                                <button 
                                  onClick={() => handleUpdateStatus(item.id, 'Confirmed')}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleUpdateStatus(item.id, 'Rejected')}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600 font-medium">Total Bookings</span>
                <span className="text-xl font-bold text-[#1E3A8A]">{schedule.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600 font-medium">Pending Approvals</span>
                <span className="text-xl font-bold text-amber-600">{schedule.filter(s => s.status === 'Pending').length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600 font-medium">Available Rooms</span>
                <span className="text-xl font-bold text-green-600">8</span>
              </div>
            </div>
          </div>
          
          <div className="bg-[#1E3A8A] rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <h2 className="text-lg font-bold mb-2 relative z-10">Need a large venue?</h2>
            <p className="text-blue-200 text-sm mb-4 relative z-10">Main Auditorium is available tomorrow from 2 PM to 5 PM.</p>
            <button 
              onClick={() => {
                setNewBooking({...newBooking, location: 'Main Auditorium', startTime: '14:00', endTime: '17:00'});
                setIsSubmitting(false);
                setIsModalOpen(true);
              }}
              className="bg-white text-[#1E3A8A] px-4 py-2 rounded-lg text-sm font-bold w-full hover:bg-gray-100 transition-colors relative z-10"
            >
              Book Auditorium
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Booking Reservation">
        <form onSubmit={handleAddBooking} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
              <input required type="text" value={newBooking.title} onChange={e => setNewBooking({...newBooking, title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none" placeholder="e.g. AI/ML Guest Lecture" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input required type="date" value={newBooking.date} onChange={e => setNewBooking({...newBooking, date: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location / Venue</label>
              <select value={newBooking.location} onChange={e => setNewBooking({...newBooking, location: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] outline-none">
                <option value="">Select a venue...</option>
                <option>Main Auditorium</option>
                <option>Seminar Hall 1</option>
                <option>CSE Lab 1</option>
                <option>Lecture Hall 2</option>
                <option>Open Air Theatre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organizer / Dept</label>
              <input required type="text" value={newBooking.organizer} onChange={e => setNewBooking({...newBooking, organizer: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none" placeholder="e.g. CSE Dept" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input required type="time" value={newBooking.startTime} onChange={e => setNewBooking({...newBooking, startTime: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input required type="time" value={newBooking.endTime} onChange={e => setNewBooking({...newBooking, endTime: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none" />
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting || !newBooking.location} className="px-4 py-2 bg-[#1E3A8A] text-white rounded-lg font-medium hover:bg-[#1E40AF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? 'Requesting...' : 'Request Booking'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Bookings;
