import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Filter, Download } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Ticket = {
  id: string;
  title: string;
  location: string;
  priority: string;
  status: string;
  date: string;
  assignedTo: string;
};

const Maintenance = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const canAddRequest = user?.user_metadata?.role === 'Admin' || user?.user_metadata?.role === 'Faculty / Staff';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState(location.state?.priorityFilter || 'All');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const data = await api.get<Ticket[]>('/tickets');
      setTickets(data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    location: '',
    priority: 'Medium',
    assignedTo: 'Unassigned'
  });

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `TKT-${Math.floor(Math.random() * 10000)}`; // Simple ID gen
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    const ticketToInsert = {
      id,
      title: newTicket.title,
      location: newTicket.location,
      priority: newTicket.priority,
      status: 'Pending',
      date,
      assignedTo: newTicket.assignedTo
    };

    try {
      const saved = await api.post<Ticket>('/tickets', ticketToInsert);
      setTickets([saved, ...tickets]);

      // Immediately notify the person who submitted the ticket
      if (user?.email) {
        const notifKey = `pvpsit_notifications_${user.email}_${user?.user_metadata?.role || 'Student'}`;
        const existing: any[] = JSON.parse(localStorage.getItem(notifKey) || '[]');
        const newNotif = {
          id: Date.now(),
          title: 'Ticket Submitted',
          desc: `Your maintenance request for "${ticketToInsert.title}" at ${ticketToInsert.location} has been submitted.`,
          time: 'Just now',
          unread: true
        };
        const updated = [newNotif, ...existing];
        localStorage.setItem(notifKey, JSON.stringify(updated));
        localStorage.setItem('pvpsit_notifications', JSON.stringify(updated));
        window.dispatchEvent(new Event('pvpsit_notifications_updated'));
      }

      setIsModalOpen(false);
      setNewTicket({ title: '', location: '', priority: 'Medium', assignedTo: 'Unassigned' });
    } catch (error) {
      console.error('Error adding ticket:', error);
      alert('Failed to add ticket.');
    }
  };

  const isAdmin = user?.user_metadata?.role === 'Admin';

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/tickets/${id}/status`, { status: newStatus });
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error('Error updating ticket status:', error);
      alert('Failed to update ticket status.');
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this maintenance ticket?")) return;
    try {
      await api.delete(`/tickets/${id}`);
      setTickets(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket.');
    }
  };

  const handleExport = () => {
    const headers = ['Ticket ID', 'Issue', 'Location', 'Priority', 'Status', 'Date', 'Assigned To'];
    const rows = tickets.map(t => `"${t.id}","${t.title}","${t.location}","${t.priority}","${t.status}","${t.date}","${t.assignedTo}"`).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `maintenance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-gray-500 mt-1">Track and manage facility repair requests.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExport}
            className="bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm flex-1 sm:flex-none justify-center"
          >
            <Download size={20} className="mr-2" />
            Export CSV
          </button>
          {canAddRequest && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#1E3A8A] text-white px-4 py-2 rounded-xl font-medium hover:bg-[#1E40AF] transition-colors flex items-center shadow-lg shadow-blue-900/20 flex-1 sm:flex-none justify-center"
            >
              <Plus size={20} className="mr-2" />
              New Request
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-10 pr-4 outline-none focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A] transition-all"
            />
          </div>
          <div className="flex space-x-3">
             <div className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
              <Filter size={18} />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-none outline-none cursor-pointer text-sm"
              >
                <option value="All">Status: All</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
             <div className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
              <Filter size={18} />
              <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-transparent border-none outline-none cursor-pointer text-sm"
              >
                <option value="All">Priority: All</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
             <div className="flex justify-center items-center py-20">
               <div className="w-8 h-8 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                  <th className="px-6 py-4 font-semibold">Ticket ID</th>
                  <th className="px-6 py-4 font-semibold">Issue</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold">Priority</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Assigned To</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets
                  .filter(t => 
                    (statusFilter === 'All' || t.status === statusFilter) &&
                    (priorityFilter === 'All' || t.priority === priorityFilter) &&
                    (t.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                     t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                     t.location.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-[#1E3A8A] font-medium">{ticket.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{ticket.title}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{ticket.location}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ticket.priority === 'High' ? 'bg-red-100 text-red-800' :
                        ticket.priority === 'Medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          ticket.status === 'Pending' ? 'bg-amber-500' :
                          ticket.status === 'In Progress' ? 'bg-blue-500' :
                          'bg-green-500'
                        }`}></div>
                        <span className="text-sm font-medium text-gray-700">{ticket.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{ticket.assignedTo}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{ticket.date}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        {isAdmin && (
                          <>
                            {ticket.status !== 'Completed' && (
                              <button 
                                onClick={() => handleUpdateStatus(ticket.id, 'Completed')}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                              >
                                Repaired
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteTicket(ticket.id)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Maintenance Request">
        <form onSubmit={handleAddRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Description</label>
            <input required type="text" value={newTicket.title} onChange={e => setNewTicket({...newTicket, title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none" placeholder="e.g. Broken Projector Mount" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input required type="text" value={newTicket.location} onChange={e => setNewTicket({...newTicket, location: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none" placeholder="e.g. CSE Lab 1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={newTicket.priority} onChange={e => setNewTicket({...newTicket, priority: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] outline-none">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign To (Optional)</label>
            <select value={newTicket.assignedTo} onChange={e => setNewTicket({...newTicket, assignedTo: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] outline-none">
              <option>Unassigned</option>
              <option>CSE Dept</option>
              <option>ECE Dept</option>
              <option>Mech Dept</option>
              <option>CSM Dept</option>
              <option>CSD Dept</option>
              <option>Civil Dept</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-[#1E3A8A] text-white rounded-lg font-medium hover:bg-[#1E40AF] transition-colors">Submit Request</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Maintenance;
