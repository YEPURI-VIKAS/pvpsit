import { useState, useEffect, useRef } from 'react';
import { Search, Filter, Plus, MonitorPlay, Wind, Projector, CheckCircle2, AlertCircle } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { api, uploadImage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Facility = {
  id: string;
  name: string;
  type: string;
  capacity: number;
  status: string;
  equipment: string[];
  image?: string;
};

const Facilities = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const { user } = useAuth();
  const isAdmin = user?.user_metadata?.role === 'Admin';
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      const data = await api.get<Facility[]>('/facilities');
      data.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      setFacilities(data);
    } catch (error) {
      console.error('Error fetching facilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFacility, setNewFacility] = useState({
    id: '',
    name: '',
    type: 'Classroom',
    capacity: 30,
    status: 'Available',
    equipment: '',
    image: ''
  });

  // States for viewing and booking
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Booking form state
  const [bookingEvent, setBookingEvent] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddFacilityFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadImage(file, 'facility-photos');
      setNewFacility(prev => ({ ...prev, image: url }));
    } catch (err: any) {
      console.error(err);
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEditFacilityFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadImage(file, 'facility-photos');
      if (selectedFacility) {
        const updated = await api.patch<Facility>(`/facilities/${selectedFacility.id}`, {
          ...selectedFacility,
          image: url
        });
        setFacilities(prev => prev.map(f => f.id === selectedFacility.id ? updated : f));
        setSelectedFacility(updated);
        alert('Facility photo updated successfully!');
      }
    } catch (err: any) {
      console.error(err);
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    const equipmentArray = newFacility.equipment.split(',').map(item => item.trim()).filter(item => item);
    
    const facilityToInsert = {
      id: newFacility.id,
      name: newFacility.name,
      type: newFacility.type,
      capacity: newFacility.capacity,
      status: newFacility.status,
      equipment: equipmentArray.length > 0 ? equipmentArray : ['None'],
      image: newFacility.image
    };

    try {
      const saved = await api.post<Facility>('/facilities', facilityToInsert);
      setFacilities([...facilities, saved]);
      setIsAddModalOpen(false);
      setNewFacility({ id: '', name: '', type: 'Classroom', capacity: 30, status: 'Available', equipment: '', image: '' });
    } catch (error) {
      console.error('Error adding facility:', error);
      alert('Failed to add facility.');
    }
  };



  const handleDeleteFacility = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this facility?")) return;
    try {
      await api.delete(`/facilities/${id}`);
      setFacilities(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('Error deleting facility:', error);
      alert('Failed to delete facility.');
    }
  };

  const handleViewDetails = (facility: Facility) => {
    setSelectedFacility(facility);
    setIsViewModalOpen(true);
  };

  const submittingRef = useRef(false);

  const handleBookNow = (facility: Facility) => {
    setSelectedFacility(facility);
    setBookingEvent('');
    setBookingTime('');
    setBookingSuccess(false);
    setBookingError('');
    setIsSubmitting(false);
    submittingRef.current = false;
    setIsBookModalOpen(true);
  };

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || submittingRef.current) return;
    if (selectedFacility?.status === 'Maintenance') {
      setBookingError('Cannot book a facility currently under maintenance.');
      return;
    }
    if (selectedFacility?.status === 'In Use') {
      setBookingError('Facility is currently in use. Please select a different time.');
      return;
    }
    
    setIsSubmitting(true);
    submittingRef.current = true;
    try {
      const id = `BKG-${Math.floor(Math.random() * 10000)}`;
      
      // Format datetime-local (YYYY-MM-DDTHH:MM) to "YYYY-MM-DD at HH:MM AM/PM"
      const [datePart, timePart] = bookingTime.split('T');
      const formatTime = (t: string) => {
        if (!t) return '12:00 PM';
        const [hours, minutes] = t.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
      };
      const timeString = datePart && timePart ? `${datePart} at ${formatTime(timePart)}` : '2026-05-20 at 09:00 AM - 11:00 AM';

      await api.post('/bookings', {
        id,
        title: bookingEvent,
        time: timeString,
        location: selectedFacility?.name || '',
        organizer: user?.user_metadata?.full_name || 'Staff Member',
        organizerEmail: user?.email || '',
        status: 'Pending'
      });

      setBookingError('');
      setBookingSuccess(true);
      
      // Auto close after success
      setTimeout(() => {
        setIsBookModalOpen(false);
        setBookingSuccess(false);
        submittingRef.current = false;
      }, 2500);

    } catch (error) {
      console.error('Error adding booking:', error);
      setBookingError('Failed to save booking.');
      submittingRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facilities</h1>
          <p className="text-gray-500 mt-1">Manage classrooms, labs, and seminar halls.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#1E3A8A] text-white px-4 py-2 rounded-xl font-medium hover:bg-[#1E40AF] transition-colors flex items-center shadow-lg shadow-blue-900/20"
          >
            <Plus size={20} className="mr-2" />
            Add Facility
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by room name or number..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 outline-none focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A] transition-all"
          />
        </div>
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors">
            <Filter size={18} />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="In Use">In Use</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {facilities
            .filter(f => 
              (statusFilter === 'All' || f.status === statusFilter) &&
              (f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
               f.id.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            .map((facility) => (
            <div key={facility.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover-lift group flex flex-col h-full">
              <div 
                className="h-32 relative p-6 flex items-end shrink-0 bg-cover bg-center overflow-hidden"
                style={{ 
                  backgroundImage: facility.image 
                    ? `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7)), url(${facility.image})` 
                    : undefined 
                }}
              >
                {!facility.image && (
                  <div className={`absolute inset-0 bg-gradient-to-r ${
                    facility.type === 'Computer Lab' ? 'from-blue-600 to-indigo-700' : 
                    facility.type === 'Classroom' ? 'from-indigo-600 to-purple-700' : 
                    facility.type === 'Seminar Hall' ? 'from-purple-600 to-pink-700' : 
                    'from-teal-600 to-emerald-700'
                  }`} />
                )}
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium border border-white/10">
                  {facility.type}
                </div>
                <h3 className="text-2xl font-bold text-white z-10 drop-shadow-md">{facility.name}</h3>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                  <div>
                    <p className="text-sm text-gray-500">Room No.</p>
                    <p className="font-semibold text-gray-900">{facility.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Capacity</p>
                    <p className="font-semibold text-gray-900">{facility.capacity}</p>
                  </div>
                  <div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      facility.status === 'Available' ? 'bg-green-100 text-green-700' :
                      facility.status === 'In Use' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {facility.status}
                    </span>
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-3">Available Equipment</p>
                  <div className="flex flex-wrap gap-2">
                    {facility.equipment?.map((eq, i) => (
                      <span key={i} className="flex items-center bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium">
                        {eq.includes('AC') && <Wind size={14} className="mr-1.5" />}
                        {eq.includes('Projector') && <Projector size={14} className="mr-1.5" />}
                        {eq.includes('PC') && <MonitorPlay size={14} className="mr-1.5" />}
                        {eq}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button 
                  onClick={() => handleViewDetails(facility)}
                  className="text-sm font-semibold text-[#1E3A8A] hover:text-[#1E40AF]"
                >
                  View Details
                </button>
                <div className="flex items-center space-x-2">
                  {isAdmin && (
                    <button 
                      onClick={() => handleDeleteFacility(facility.id)}
                      className="text-sm font-semibold text-red-600 hover:text-red-700 mr-2"
                    >
                      Delete
                    </button>
                  )}
                  <button 
                    onClick={() => handleBookNow(facility)}
                    className="bg-[#1E3A8A] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-[#1E40AF]"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Facility Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Facility">
        <form onSubmit={handleAddFacility} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room No.</label>
              <input required type="text" value={newFacility.id} onChange={e => setNewFacility({...newFacility, id: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none" placeholder="e.g. 102" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facility Name</label>
              <input required type="text" value={newFacility.name} onChange={e => setNewFacility({...newFacility, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none" placeholder="e.g. Chemistry Lab" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={newFacility.type} onChange={e => setNewFacility({...newFacility, type: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] outline-none">
                <option>Classroom</option>
                <option>Computer Lab</option>
                <option>Electronics Lab</option>
                <option>Seminar Hall</option>
                <option>Workshop</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
              <input required type="number" min="1" value={newFacility.capacity} onChange={e => setNewFacility({...newFacility, capacity: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment (comma separated)</label>
            <input type="text" value={newFacility.equipment} onChange={e => setNewFacility({...newFacility, equipment: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none" placeholder="e.g. AC, Projector, Whiteboard" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facility Image File</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleAddFacilityFileChange} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none text-sm bg-white" 
            />
            {uploading && <p className="text-xs text-[#1E3A8A] animate-pulse mt-1">Uploading image...</p>}
            {newFacility.image && (
              <p className="text-xs text-green-600 mt-1">✓ Image uploaded successfully</p>
            )}
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 mt-6">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-[#1E3A8A] text-white rounded-lg font-medium hover:bg-[#1E40AF] transition-colors">Add Facility</button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Facility Details">
        {selectedFacility && (
          <div className="space-y-6">
            {selectedFacility.image && (
              <div 
                className="w-full h-48 rounded-xl overflow-hidden shadow-md border border-gray-100 bg-cover bg-center" 
                style={{ backgroundImage: `url(${selectedFacility.image})` }} 
              />
            )}
            
            <div className="flex items-center space-x-4 mb-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0 ${selectedFacility.type === 'Computer Lab' ? 'bg-blue-600' : selectedFacility.type === 'Classroom' ? 'bg-indigo-600' : selectedFacility.type === 'Seminar Hall' ? 'bg-purple-600' : 'bg-teal-600'}`}>
                {selectedFacility.id}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{selectedFacility.name}</h3>
                <p className="text-gray-500">{selectedFacility.type}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Capacity</p>
                <p className="font-medium text-gray-900">{selectedFacility.capacity} Students</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Current Status</p>
                <span className={`inline-flex px-2 py-0.5 mt-1 text-xs font-medium rounded-full ${
                  selectedFacility.status === 'Available' ? 'bg-green-100 text-green-700' :
                  selectedFacility.status === 'In Use' ? 'bg-blue-100 text-blue-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {selectedFacility.status}
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2 border-b border-gray-100 pb-2">Installed Equipment</h4>
              <ul className="space-y-2">
                {selectedFacility.equipment?.map((eq, i) => (
                  <li key={i} className="flex items-center text-gray-600">
                    <div className="w-1.5 h-1.5 bg-[#1E3A8A] rounded-full mr-2"></div>
                    {eq}
                  </li>
                ))}
              </ul>
            </div>

            {isAdmin && (
              <div className="space-y-2 mt-4 pt-4 border-t border-gray-150">
                <label className="block text-sm font-semibold text-gray-700">Upload Facility Image File</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleEditFacilityFileChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none text-sm bg-white" 
                />
                {uploading && <p className="text-xs text-[#1E3A8A] animate-pulse mt-1">Uploading image...</p>}
              </div>
            )}

            <div className="pt-4 flex justify-end border-t border-gray-100">
              <button 
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleBookNow(selectedFacility);
                }} 
                className="px-4 py-2 bg-[#1E3A8A] text-white rounded-lg font-medium hover:bg-[#1E40AF] transition-colors"
              >
                Book This Facility
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Book Now Modal */}
      <Modal isOpen={isBookModalOpen} onClose={() => setIsBookModalOpen(false)} title={`Book ${selectedFacility?.name}`}>
        {bookingSuccess ? (
           <div className="text-center py-8">
             <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
               <CheckCircle2 className="h-6 w-6 text-green-600" />
             </div>
             <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Booking Requested!</h3>
             <p className="text-sm text-gray-500">
               Your booking request for {selectedFacility?.name} has been submitted for approval.
             </p>
           </div>
        ) : (
          <form onSubmit={submitBooking} className="space-y-4">
            {bookingError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start">
                <AlertCircle size={20} className="mr-2 shrink-0 mt-0.5" />
                <p className="text-sm">{bookingError}</p>
              </div>
            )}
            
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mb-4">
              <p className="text-sm text-blue-800">
                You are requesting to book <strong>{selectedFacility?.name}</strong> (Room {selectedFacility?.id}).
                Maximum capacity is {selectedFacility?.capacity} people.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
              <input required type="text" value={bookingEvent} onChange={e => setBookingEvent(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none" placeholder="e.g. Extra Class" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
              <input required type="datetime-local" value={bookingTime} onChange={e => setBookingTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none" />
            </div>

            <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 mt-6">
              <button type="button" onClick={() => setIsBookModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-[#1E3A8A] text-white rounded-lg font-medium hover:bg-[#1E40AF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Facilities;
