import React, { useState, useEffect } from 'react';
import api from '../api';
import { Building2, Plus, Users, Search } from 'lucide-react';

const VendorManagement = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [vendorCode, setVendorCode] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [totalEmp, setTotalEmp] = useState('');
  const [rate, setRate] = useState('');
  const [contractPerson, setContractPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vendor');
      setVendors(res.data.vendors);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    
    // Client-side validations
    if (!vendorCode || vendorCode.trim().length > 10) {
      setFormError('Vendor Code is required and must be maximum 10 characters.');
      setFormLoading(false);
      return;
    }
    if (!vendorName || vendorName.trim().length > 40) {
      setFormError('Vendor Name is required and must be maximum 40 characters.');
      setFormLoading(false);
      return;
    }
    if (totalEmp) {
      const empNum = Number(totalEmp);
      if (isNaN(empNum) || empNum < 0 || !Number.isInteger(empNum) || totalEmp.length > 5) {
        setFormError('Total Employees must be a positive integer and maximum 5 digits.');
        setFormLoading(false);
        return;
      }
    }
    if (rate) {
      const rateNum = Number(rate);
      if (isNaN(rateNum) || rateNum < 0 || rate.length > 10) {
        setFormError('Rate must be a positive number and maximum 10 characters.');
        setFormLoading(false);
        return;
      }
    }
    if (contractPerson && contractPerson.length > 40) {
      setFormError('Contact Person must be maximum 40 characters.');
      setFormLoading(false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (contactEmail && (!emailRegex.test(contactEmail) || contactEmail.length > 100)) {
      setFormError('Contact Email must be a valid email format and maximum 100 characters.');
      setFormLoading(false);
      return;
    }
    if (contactPhone) {
      const phoneRegex = /^\d+$/;
      if (!phoneRegex.test(contactPhone) || contactPhone.length > 10) {
        setFormError('Contact Phone must contain only numbers and be maximum 10 digits.');
        setFormLoading(false);
        return;
      }
    }
    if (contactAddress && contactAddress.length > 255) {
      setFormError('Contact Address must be maximum 255 characters.');
      setFormLoading(false);
      return;
    }

    try {
      await api.post('/vendor', { 
        vendor_code: vendorCode, 
        vendor_name: vendorName,
        total_emp: totalEmp,
        rate,
        contract_person: contractPerson,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        contact_address: contactAddress
      });
      setShowForm(false);
      setVendorCode('');
      setVendorName('');
      setTotalEmp('');
      setRate('');
      setContractPerson('');
      setContactEmail('');
      setContactPhone('');
      setContactAddress('');
      fetchVendors();
    } catch (err: any) {
      const detailedErr = err.response?.data?.error;
      const parsedErr = detailedErr && typeof detailedErr === 'string'
        ? detailedErr.replace(/^Failed to communicate with S\/4HANA:\s*/i, '')
        : null;
      setFormError(parsedErr || err.response?.data?.message || 'Failed to create vendor');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleVendorStatus = async (vCode: string, currentStatus: string) => {
    const isCurrentlyActive = (currentStatus || '').toLowerCase() === 'active';
    const newStatus = isCurrentlyActive ? 'DEACTIVE' : 'ACTIVE';
    try {
      await api.put(`/vendor/${vCode}/status`, { status: newStatus });
      fetchVendors();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update vendor status');
    }
  };

  const activeVendorsCount = vendors.filter(v => (v.status || '').toLowerCase() === 'active').length;

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel bg-white p-6 rounded-2xl flex items-center shadow-sm">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mr-4">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Total Active Vendors</p>
            <h3 className="text-3xl font-bold text-slate-900">{activeVendorsCount}</h3>
          </div>
        </div>
      </div>

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-64">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search vendors..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none shadow-sm text-slate-900"
          />
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg shadow-sm shadow-primary/20 transition-colors flex items-center font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Vendor
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="glass-panel bg-white p-6 rounded-2xl border border-primary/20 shadow-md animate-fade-in-up">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Add New Vendor</h3>
          {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>}
          
          <form onSubmit={handleCreateVendor} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Vendor Code *</label>
                <input 
                  type="text" required value={vendorCode} onChange={(e) => setVendorCode(e.target.value)} maxLength={10}
                  placeholder="e.g. V-101"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Vendor Name *</label>
                <input 
                  type="text" required value={vendorName} onChange={(e) => setVendorName(e.target.value)} maxLength={40}
                  placeholder="e.g. Acme Corp"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Total Employees</label>
                <input 
                  type="number" value={totalEmp} onChange={(e) => setTotalEmp(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Rate</label>
                <input 
                  type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 100.00"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Person</label>
                <input 
                  type="text" value={contractPerson} onChange={(e) => setContractPerson(e.target.value)} maxLength={40}
                  placeholder="John Doe"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Email</label>
                <input 
                  type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} maxLength={100}
                  placeholder="john@example.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input 
                  type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} maxLength={10}
                  placeholder="90000000000"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Address</label>
                <textarea 
                  value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} maxLength={255}
                  placeholder="123 Main St, City..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <button 
                type="submit" disabled={formLoading}
                className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg shadow-sm font-medium w-full md:w-auto disabled:opacity-50"
              >
                {formLoading ? 'Saving...' : 'Save Vendor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="glass-panel bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                <th className="p-4 font-semibold">Vendor Code</th>
                <th className="p-4 font-semibold">Vendor Name</th>
                <th className="p-4 font-semibold">Rate</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Total Employees</th>
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">Loading vendors...</td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No vendors found.</td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-slate-900 font-mono font-medium">{vendor.vendor_code}</td>
                    <td className="p-4 text-slate-900 font-medium">
                      {vendor.vendor_name}
                      {vendor.contact_email && <div className="text-xs text-slate-500 font-normal">{vendor.contact_email}</div>}
                    </td>

                    <td className="p-4 text-slate-600">{vendor.rate ? `₹${vendor.rate}` : '-'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        (vendor.status || '').toLowerCase() === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                        'bg-rose-100 text-rose-700 border border-rose-200'
                      }`}>
                        {(vendor.status || 'ACTIVE').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2 text-slate-400" />
                        {vendor.total_emp || 0}
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleVendorStatus(vendor.vendor_code, vendor.status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors border ${
                          (vendor.status || '').toLowerCase() === 'active'
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200'
                        }`}
                      >
                        {(vendor.status || '').toLowerCase() === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VendorManagement;
