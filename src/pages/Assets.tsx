import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Monitor, Cpu, Armchair, BookOpen } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { api, uploadImage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Asset = {
  id: string;
  name: string;
  category: string;
  location: string;
  status: string;
  purchaseDate: string;
  image?: string;
};

const Assets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const { user } = useAuth();
  const isAdmin = user?.user_metadata?.role === 'Admin';
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const data = await api.get<Asset[]>('/assets');
      setAssets(data);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: 'Computer',
    location: '',
    status: 'Active',
    purchaseDate: '',
    image: ''
  });

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleAddAssetFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadImage(file, 'facility-photos');
      setNewAsset(prev => ({ ...prev, image: url }));
    } catch (err: any) {
      console.error(err);
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEditAssetFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadImage(file, 'facility-photos');
      if (selectedAsset) {
        const updated = await api.patch<Asset>(`/assets/${selectedAsset.id}`, {
          ...selectedAsset,
          image: url
        });
        setAssets(prev => prev.map(a => a.id === selectedAsset.id ? updated : a));
        setSelectedAsset(updated);
        alert('Asset photo updated successfully!');
      }
    } catch (err: any) {
      console.error(err);
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const getIcon = (category: string) => {
    switch(category) {
      case 'Computer': return <Monitor size={18} className="text-blue-500" />;
      case 'Electronics': return <Cpu size={18} className="text-indigo-500" />;
      case 'Equipment': return <BookOpen size={18} className="text-purple-500" />;
      case 'Furniture': return <Armchair size={18} className="text-amber-500" />;
      default: return <Monitor size={18} className="text-gray-500" />;
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `AST-${Math.floor(Math.random() * 10000)}`; // Simple ID gen
    
    // Format date if empty
    const dateToUse = newAsset.purchaseDate 
      ? new Date(newAsset.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      
    const assetToInsert = {
      id,
      name: newAsset.name,
      category: newAsset.category,
      location: newAsset.location,
      status: newAsset.status,
      purchaseDate: dateToUse,
      image: newAsset.image
    };

    try {
      const saved = await api.post<Asset>('/assets', assetToInsert);
      setAssets([saved, ...assets]);
      
      window.dispatchEvent(new CustomEvent('pvpsit_show_toast', {
        detail: { title: 'Asset Added', desc: `${assetToInsert.name} has been added to inventory.` }
      }));

      setIsModalOpen(false);
      setNewAsset({ name: '', category: 'Computer', location: '', status: 'Active', purchaseDate: '', image: '' });
    } catch (error) {
      console.error('Error adding asset:', error);
      alert('Failed to add asset.');
    }
  };



  const handleViewDetails = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsViewModalOpen(true);
  };

  const handleDeleteAsset = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this asset?")) return;
    try {
      await api.delete(`/assets/${id}`);
      setAssets(prev => prev.filter(a => a.id !== id));
      
      window.dispatchEvent(new CustomEvent('pvpsit_show_toast', {
        detail: { title: 'Asset Deleted', desc: `Asset ${id} has been removed.` }
      }));
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Failed to delete asset.');
    }
  };

  const handleExport = () => {
    const headers = ['Asset ID', 'Name', 'Category', 'Location', 'Status', 'Date Added'];
    const rows = assets.map(a => `"${a.id}","${a.name}","${a.category}","${a.location}","${a.status}","${a.purchaseDate}"`).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `assets_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assets Inventory</h1>
          <p className="text-gray-500 mt-1">Manage college equipment and furniture.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExport}
            className="bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm flex-1 sm:flex-none justify-center"
          >
            <Download size={20} className="mr-2" />
            Export CSV
          </button>
          {isAdmin && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#1E3A8A] text-white px-4 py-2 rounded-xl font-medium hover:bg-[#1E40AF] transition-colors flex items-center shadow-lg shadow-blue-900/20 flex-1 sm:flex-none justify-center"
            >
              <Plus size={20} className="mr-2" />
              Add Asset
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search assets by ID, name, or location..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 outline-none focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A] transition-all"
            />
          </div>
          <div className="flex gap-3">
            <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors flex items-center space-x-2">
              <Filter size={18} />
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent border-none outline-none cursor-pointer text-sm"
              >
                <option value="All">Category: All</option>
                <option value="Computer">Computer</option>
                <option value="Electronics">Electronics</option>
                <option value="Equipment">Equipment</option>
                <option value="Furniture">Furniture</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors flex items-center space-x-2">
              <Filter size={18} />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-none outline-none cursor-pointer text-sm"
              >
                <option value="All">Status: All</option>
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
           <div className="flex justify-center items-center py-20">
             <div className="w-8 h-8 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin"></div>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {assets
              .filter(a => 
                (categoryFilter === 'All' || a.category === categoryFilter) &&
                (statusFilter === 'All' || a.status === statusFilter) &&
                (a.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                 a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                 a.location.toLowerCase().includes(searchQuery.toLowerCase()))
              )
              .map((asset) => (
              <div 
                key={asset.id} 
                onClick={() => handleViewDetails(asset)}
                className="border border-gray-100 rounded-xl overflow-hidden hover:border-blue-200 hover:shadow-md transition-all group cursor-pointer bg-gray-50/50 hover:bg-white flex flex-col h-full"
              >
                {asset.image ? (
                  <div className="h-36 bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${asset.image})` }} />
                ) : (
                  <div className="h-36 bg-gradient-to-br from-gray-50 to-gray-100/50 flex items-center justify-center border-b border-gray-100 shrink-0">
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-150 group-hover:scale-110 transition-transform">
                      {getIcon(asset.category)}
                    </div>
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      {asset.image && (
                        <div className="bg-white p-1.5 rounded-lg shadow-sm border border-gray-100">
                          {getIcon(asset.category)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">{asset.name}</h3>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{asset.id}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAsset(asset.id);
                        }}
                        className="text-red-600 hover:text-red-700 text-xs font-semibold p-1.5 hover:bg-red-50 rounded-lg transition-colors z-10"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-2 mt-auto pt-3 border-t border-gray-50 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs block mb-0.5">Location</span>
                      <span className="font-medium text-gray-800">{asset.location}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs block mb-0.5">Category</span>
                      <span className="font-medium text-gray-800">{asset.category}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs block mb-0.5">Purchase Date</span>
                      <span className="font-medium text-gray-800">{asset.purchaseDate}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs block mb-0.5">Status</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        asset.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {asset.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Asset">
        <form onSubmit={handleAddAsset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name / Model</label>
            <input required type="text" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none" placeholder="e.g. Dell Optiplex 7090" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={newAsset.category} onChange={e => setNewAsset({...newAsset, category: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] outline-none">
                <option>Computer</option>
                <option>Electronics</option>
                <option>Equipment</option>
                <option>Furniture</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={newAsset.status} onChange={e => setNewAsset({...newAsset, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] outline-none">
                <option>Active</option>
                <option>Maintenance</option>
                <option>Retired</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Location</label>
              <input required type="text" value={newAsset.location} onChange={e => setNewAsset({...newAsset, location: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none" placeholder="e.g. CSE Lab 1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
              <input type="date" value={newAsset.purchaseDate} onChange={e => setNewAsset({...newAsset, purchaseDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Image File</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleAddAssetFileChange} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none text-sm bg-white" 
            />
            {uploading && <p className="text-xs text-[#1E3A8A] animate-pulse mt-1">Uploading image...</p>}
            {newAsset.image && (
              <p className="text-xs text-green-600 mt-1">✓ Image uploaded successfully</p>
            )}
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-[#1E3A8A] text-white rounded-lg font-medium hover:bg-[#1E40AF] transition-colors">Add Asset</button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Asset Details">
        {selectedAsset && (
          <div className="space-y-6">
            {selectedAsset.image && (
              <div 
                className="w-full h-48 rounded-xl overflow-hidden shadow-md border border-gray-100 bg-cover bg-center" 
                style={{ backgroundImage: `url(${selectedAsset.image})` }} 
              />
            )}
            
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
                {getIcon(selectedAsset.category)}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{selectedAsset.name}</h3>
                <p className="text-sm text-gray-500 font-mono">{selectedAsset.id}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Location</p>
                <p className="font-medium text-gray-900">{selectedAsset.location}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Category</p>
                <p className="font-medium text-gray-900">{selectedAsset.category}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Purchase Date</p>
                <p className="font-medium text-gray-900">{selectedAsset.purchaseDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Current Status</p>
                <span className={`inline-flex px-2 py-0.5 mt-1 text-xs font-medium rounded-full ${
                  selectedAsset.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {selectedAsset.status}
                </span>
              </div>
            </div>

            {isAdmin && (
              <div className="space-y-2 mt-4 pt-4 border-t border-gray-150">
                <label className="block text-sm font-semibold text-gray-700">Upload Asset Image File</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleEditAssetFileChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none text-sm bg-white" 
                />
                {uploading && <p className="text-xs text-[#1E3A8A] animate-pulse mt-1">Uploading image...</p>}
              </div>
            )}

            <div className="pt-4 flex justify-end border-t border-gray-100">
              <button 
                onClick={() => setIsViewModalOpen(false)} 
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Assets;
