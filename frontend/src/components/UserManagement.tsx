import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, UserPlus, Search, Clock } from 'lucide-react';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [excUserId, setExcUserId] = useState('');
  const [excFromDate, setExcFromDate] = useState('');
  const [excToDate, setExcToDate] = useState('');
  const [excGridData, setExcGridData] = useState<any[]>([]);
  const [isGridOpen, setIsGridOpen] = useState(false);
  const [excLoading, setExcLoading] = useState(false);
  const [excMessage, setExcMessage] = useState('');
  const [excError, setExcError] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [vendorId, setVendorId] = useState('');
  
  // New Form state
  const [designation, setDesignation] = useState('CONSULTANT');
  const [track, setTrack] = useState('S4HANA');
  const [moduleVal, setModuleVal] = useState('MM');
  const [billingAllocation, setBillingAllocation] = useState('FULL');
  const [vendorMail, setVendorMail] = useState('');
  const [vendorDomain, setVendorDomain] = useState('');
  const [vendorRole, setVendorRole] = useState('ML');
  const [onboardingDate, setOnboardingDate] = useState('');
  const [offboardingDate, setOffboardingDate] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/user');
      setUsers(res.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    if (currentUser?.role === 'SUPER_ADMIN') {
      try {
        const res = await api.get('/vendor');
        setVendors(res.data.vendors);
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchVendors();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    
    // Client-side validations
    if (!name || name.trim().length > 40) {
      setFormError('Full Name is required and must be maximum 40 characters.');
      setFormLoading(false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length > 100) {
      setFormError('A valid Email Address is required and must be maximum 100 characters.');
      setFormLoading(false);
      return;
    }
    if (!password || password.length > 100) {
      setFormError('Password is required and must be maximum 100 characters.');
      setFormLoading(false);
      return;
    }
    if (vendorMail && (!emailRegex.test(vendorMail) || vendorMail.length > 100)) {
      setFormError('Vendor Email must be a valid email format and maximum 100 characters.');
      setFormLoading(false);
      return;
    }
    if (vendorDomain && vendorDomain.length > 40) {
      setFormError('Vendor Domain must be maximum 40 characters.');
      setFormLoading(false);
      return;
    }
    if (onboardingDate && onboardingDate.length > 10) {
      setFormError('Onboarding Date must be maximum 10 characters.');
      setFormLoading(false);
      return;
    }
    if (offboardingDate && offboardingDate.length > 10) {
      setFormError('Offboarding Date must be maximum 10 characters.');
      setFormLoading(false);
      return;
    }
    if (onboardingDate && offboardingDate) {
      if (new Date(onboardingDate) > new Date(offboardingDate)) {
        setFormError('Onboarding Date cannot be after Offboarding Date.');
        setFormLoading(false);
        return;
      }
    }
    
    try {
      await api.post('/user', { 
        name, 
        email, 
        password,
        role,
        vendor_id: currentUser?.role === 'SUPER_ADMIN' ? vendorId : (currentUser as any)?.vendor_code || (currentUser as any)?.vendor_id,
        designation,
        track,
        module: moduleVal,
        billing_allocation: billingAllocation,
        vendor_mail: vendorMail,
        vendor_domain: vendorDomain,
        vendor_role: vendorRole,
        onboarding_date: onboardingDate ? onboardingDate : null,
        offboarding_date: offboardingDate ? offboardingDate : null
      });
      setShowForm(false);
      setName('');
      setEmail('');
      setPassword('');
      setRole('EMPLOYEE');
      setVendorId('');
      setDesignation('CONSULTANT');
      setTrack('S4HANA');
      setModuleVal('MM');
      setBillingAllocation('FULL');
      setVendorMail('');
      setVendorDomain('');
      setVendorRole('ML');
      setOnboardingDate('');
      setOffboardingDate('');
      fetchUsers();
    } catch (err: any) {
      const detailedErr = err.response?.data?.error;
      const parsedErr = detailedErr && typeof detailedErr === 'string'
        ? detailedErr.replace(/^Failed to communicate with S\/4HANA:\s*/i, '')
        : null;
      setFormError(parsedErr || err.response?.data?.message || 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleFetchDates = async (e: React.FormEvent) => {
    e.preventDefault();
    setExcError('');
    if (!excUserId || !excFromDate || !excToDate) {
      setExcError('Please select user and date range');
      return;
    }
    const start = new Date(excFromDate);
    const end = new Date(excToDate);
    if (start > end) {
      setExcError('From Date cannot be after To Date');
      return;
    }

    setExcLoading(true);
    try {
      const res = await api.get(`/attendance/user/${excUserId}/range?start_date=${excFromDate}&end_date=${excToDate}`);
      const existingRecords = res.data.records;

      const grid = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const currentDateStr = d.toISOString().split('T')[0];
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        
        const existing = existingRecords.find((r: any) => new Date(r.work_date).toISOString().split('T')[0] === currentDateStr);
        
        grid.push({
          date: currentDateStr,
          isWeekend,
          isCompleted: !!existing,
          realClockIn: existing ? new Date(existing.clock_in_time).toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit'}) : '',
          realClockOut: existing && existing.clock_out_time ? new Date(existing.clock_out_time).toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit'}) : '',
          realTask: existing && existing.worksheet ? existing.worksheet.tasks_description : '',
          realLocation: existing ? existing.manual_location : '',
          clockIn: '09:00',
          clockOut: '18:00',
          task: 'Onboarding / General Shift',
          location: 'System Generated'
        });
      }
      
      setExcGridData(grid);
      setIsGridOpen(true);
    } catch (err: any) {
      setExcError(err.response?.data?.message || 'Failed to fetch dates');
    } finally {
      setExcLoading(false);
    }
  };

  const handleGridChange = (index: number, field: string, value: string) => {
    const newData = [...excGridData];
    newData[index][field] = value;
    setExcGridData(newData);
  };

  const handleSaveException = async () => {
    setExcError('');
    setExcMessage('');
    setExcLoading(true);
    
    // Filter only valid days to submit
    const recordsToSubmit = excGridData
      .filter(row => !row.isWeekend && !row.isCompleted)
      .map(row => ({
        work_date: row.date,
        clock_in_time: row.clockIn,
        clock_out_time: row.clockOut,
        tasks_description: row.task,
        manual_location: row.location
      }));

    if (recordsToSubmit.length === 0) {
      setExcError('No new valid days to save.');
      setExcLoading(false);
      return;
    }

    try {
      const res = await api.post('/attendance/exception', {
        target_user_id: excUserId,
        records: recordsToSubmit
      });
      setExcMessage(res.data.message);
      setTimeout(() => {
        setShowExceptionForm(false);
        setIsGridOpen(false);
        setExcMessage('');
      }, 3000);
    } catch (err: any) {
      setExcError(err.response?.data?.message || 'Failed to add exception attendance');
    } finally {
      setExcLoading(false);
    }
  };

  const activeEmployees = users.filter(u => u.role === 'EMPLOYEE').length;
  const activeVendorAdmins = users.filter(u => u.role === 'VENDOR_ADMIN').length;

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.vendor_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel bg-white p-6 rounded-2xl flex items-center shadow-sm">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mr-4">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Total Employees</p>
            <h3 className="text-3xl font-bold text-slate-900">{activeEmployees}</h3>
          </div>
        </div>
        
        {currentUser?.role === 'SUPER_ADMIN' && (
          <div className="glass-panel bg-white p-6 rounded-2xl flex items-center shadow-sm">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mr-4">
              <UserPlus className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Vendor Admins</p>
              <h3 className="text-3xl font-bold text-slate-900">{activeVendorAdmins}</h3>
            </div>
          </div>
        )}
      </div>

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-64">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none shadow-sm text-slate-900"
          />
        </div>
        <div className="flex gap-3">
          {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'VENDOR_ADMIN') && (
            <button 
              onClick={() => { setShowExceptionForm(!showExceptionForm); setShowForm(false); }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2.5 rounded-lg shadow-sm shadow-yellow-500/20 transition-colors flex items-center font-medium"
            >
              <Clock className="w-5 h-5 mr-2" />
              Exception Attendance
            </button>
          )}
          <button 
            onClick={() => { setShowForm(!showForm); setShowExceptionForm(false); }}
            className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg shadow-sm shadow-primary/20 transition-colors flex items-center font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Exception Form */}
      {showExceptionForm && (
        <div className="glass-panel bg-white p-6 rounded-2xl border border-yellow-200 shadow-md animate-fade-in-up">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Exception Attendance Configuration</h3>
          <p className="text-sm text-slate-500 mb-4">Select an employee and date range to configure manual exception attendance records.</p>
          {excError && <p className="text-red-500 text-sm mb-4">{excError}</p>}
          {excMessage && <p className="text-emerald-500 text-sm font-semibold mb-4">{excMessage}</p>}
          
          {!isGridOpen && (
            <form onSubmit={handleFetchDates} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Employee *</label>
                  <select 
                    required value={excUserId} onChange={(e) => setExcUserId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                  >
                    <option value="">Select employee...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">From Date *</label>
                  <input 
                    type="date" required value={excFromDate} onChange={(e) => setExcFromDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">To Date *</label>
                  <input 
                    type="date" required value={excToDate} onChange={(e) => setExcToDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button 
                  type="submit" disabled={excLoading}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-2.5 rounded-lg shadow-sm font-medium disabled:opacity-50"
                >
                  {excLoading ? 'Fetching...' : 'Fetch Dates'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Grid Modal Overlay */}
      {isGridOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Configure Exceptions</h3>
                <p className="text-sm text-slate-500 mt-1">Review existing records and configure missing attendance.</p>
              </div>
              <button onClick={() => setIsGridOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-4 w-32 whitespace-nowrap">Date</th>
                      <th className="p-4 w-28 whitespace-nowrap">Status</th>
                      <th className="p-4 min-w-[200px]">Task Description</th>
                      <th className="p-4 min-w-[150px]">Location</th>
                      <th className="p-4 w-32">Clock In</th>
                      <th className="p-4 w-32">Clock Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excGridData.map((row, i) => (
                      <tr key={i} className={`border-b border-slate-100 transition-colors ${row.isWeekend ? 'bg-slate-50 text-slate-400' : row.isCompleted ? 'bg-emerald-50/20' : 'bg-white hover:bg-slate-50'}`}>
                        <td className="p-4 font-semibold text-slate-700 whitespace-nowrap">
                          {new Date(row.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4">
                          {row.isWeekend ? (
                            <span className="px-2.5 py-1 bg-slate-200 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wider">Week Off</span>
                          ) : row.isCompleted ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold uppercase tracking-wider">Completed</span>
                          ) : (
                            <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full text-xs font-bold uppercase tracking-wider">Pending</span>
                          )}
                        </td>
                        <td className="p-3">
                          <input type="text" value={row.isCompleted ? row.realTask : row.task} 
                            disabled={row.isWeekend || row.isCompleted}
                            onChange={(e) => handleGridChange(i, 'task', e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900 text-sm disabled:opacity-50 disabled:bg-transparent disabled:border-transparent" 
                          />
                        </td>
                        <td className="p-3">
                          <input type="text" value={row.isCompleted ? row.realLocation : row.location} 
                            disabled={row.isWeekend || row.isCompleted}
                            onChange={(e) => handleGridChange(i, 'location', e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900 text-sm disabled:opacity-50 disabled:bg-transparent disabled:border-transparent" 
                          />
                        </td>
                        <td className="p-3">
                          <input type="time" value={row.isCompleted ? row.realClockIn : row.clockIn} 
                            disabled={row.isWeekend || row.isCompleted}
                            onChange={(e) => handleGridChange(i, 'clockIn', e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900 text-sm font-medium disabled:opacity-50 disabled:bg-transparent disabled:border-transparent" 
                          />
                        </td>
                        <td className="p-3">
                          <input type="time" value={row.isCompleted ? row.realClockOut : row.clockOut} 
                            disabled={row.isWeekend || row.isCompleted}
                            onChange={(e) => handleGridChange(i, 'clockOut', e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900 text-sm font-medium disabled:opacity-50 disabled:bg-transparent disabled:border-transparent" 
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button 
                type="button" onClick={() => setIsGridOpen(false)}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveException} disabled={excLoading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-2.5 rounded-lg shadow-sm font-medium disabled:opacity-50 transition-colors flex items-center"
              >
                {excLoading ? 'Saving...' : 'Save Exception Records'}
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="glass-panel bg-white p-6 rounded-2xl border border-primary/20 shadow-md animate-fade-in-up">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Add New User</h3>
          {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>}
          
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                <input 
                  type="text" required value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address *</label>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={100}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Password *</label>
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)} maxLength={100}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Designation</label>
                <select 
                  value={designation} onChange={(e) => setDesignation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                >
                  <option value="CONSULTANT">Consultant</option>
                  <option value="SR_CONSULTANT">Sr. Consultant</option>
                  <option value="ANALYST">Analyst</option>
                  <option value="MANAGER">Manager</option>
                  <option value="SR_MANAGER">Sr. Manager</option>
                  <option value="ASSOCIATE_CONSULTANT">Associate Consultant</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Track</label>
                <select 
                  value={track} onChange={(e) => setTrack(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                >
                  <option value="S4HANA">S4HANA</option>
                  <option value="MDM">MDM</option>
                  <option value="QLIK_VIEW">QLIK-VIEW</option>
                  <option value="RPA">RPA</option>
                  <option value="TA">TA</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Module</label>
                <select 
                  value={moduleVal} onChange={(e) => setModuleVal(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                >
                  {track === 'S4HANA' ? (
                    <>
                      <option value="MM">MM</option>
                      <option value="PP">PP</option>
                      <option value="QM">QM</option>
                      <option value="SD">SD</option>
                      <option value="FI">FI</option>
                      <option value="PS">PS</option>
                      <option value="PMO">PMO</option>
                      <option value="CO">CO</option>
                      <option value="ABAP">ABAP</option>
                      <option value="CPI">CPI</option>
                    </>
                  ) : (
                    <>
                      <option value={track}>{track}</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                <select 
                  value={vendorRole} onChange={(e) => setVendorRole(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                >
                  <option value="ML">ML</option>
                  <option value="CTM">CTM</option>
                  <option value="PMO">PMO</option>
                  <option value="SME">SME</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Billing Allocation</label>
                <select 
                  value={billingAllocation} onChange={(e) => setBillingAllocation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                >
                  <option value="FULL">100% (Full)</option>
                  <option value="THREE_QTR">75%</option>
                  <option value="HALF">50%</option>
                  <option value="QUARTER">25%</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Vendor Email</label>
                <input 
                  type="email" value={vendorMail} onChange={(e) => setVendorMail(e.target.value)} maxLength={100}
                  placeholder="name@vendor.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Vendor Domain</label>
                <input 
                  type="text" value={vendorDomain} onChange={(e) => setVendorDomain(e.target.value)} maxLength={40}
                  placeholder="vendor.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                />
              </div>
              



              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Onboarding Date</label>
                <input 
                  type="date" value={onboardingDate} onChange={(e) => setOnboardingDate(e.target.value)} maxLength={10}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Offboarding Date</label>
                <input 
                  type="date" value={offboardingDate} onChange={(e) => setOffboardingDate(e.target.value)} maxLength={10}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                />
              </div>
              
              {currentUser?.role === 'SUPER_ADMIN' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">System Role *</label>
                    <select 
                      value={role} onChange={(e) => setRole(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="VENDOR_ADMIN">Vendor Admin</option>
                      <option value="ADMIN">GFL Admin (Approver)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Assign Vendor *</label>
                    <select 
                      required value={vendorId} onChange={(e) => setVendorId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900"
                    >
                      <option value="">Select a vendor...</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.vendor_name} ({v.vendor_code})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex justify-end mt-4">
              <button 
                type="submit" disabled={formLoading}
                className="bg-primary hover:bg-primary-hover text-white px-8 py-2.5 rounded-lg shadow-sm font-medium disabled:opacity-50"
              >
                {formLoading ? 'Creating...' : 'Create User'}
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
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Track/Module</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">System Role</th>
                <th className="p-4 font-semibold">Onboarding Date</th>
                <th className="p-4 font-semibold">System Date</th>
                {currentUser?.role === 'SUPER_ADMIN' && (
                  <th className="p-4 font-semibold">Vendor</th>
                )}
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={currentUser?.role === 'SUPER_ADMIN' ? 8 : 7} className="p-8 text-center text-slate-500">Loading users...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={currentUser?.role === 'SUPER_ADMIN' ? 8 : 7} className="p-8 text-center text-slate-500">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-slate-900 font-medium">
                      {u.name}
                      <div className="text-xs font-normal text-slate-500">{u.designation || 'Consultant'}</div>
                    </td>
                    <td className="p-4 text-slate-500">{u.email}</td>
                    <td className="p-4 text-slate-700">
                      {u.track ? (
                        <>
                          <span className="font-semibold text-primary">{u.track}</span>
                          {u.module && <span className="text-xs text-slate-400 ml-1">({u.module})</span>}
                        </>
                      ) : '-'}
                    </td>
                    <td className="p-4 text-slate-600">
                      {u.vendor_role || '-'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 
                        u.role === 'ADMIN' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                        u.role === 'VENDOR_ADMIN' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700 whitespace-nowrap">
                      {u.onboarding_date ? new Date(u.onboarding_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}
                    </td>
                    <td className="p-4 text-slate-700 whitespace-nowrap">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}
                    </td>
                    {currentUser?.role === 'SUPER_ADMIN' && (
                      <td className="p-4 text-slate-700">
                        {(() => {
                          const vendor = vendors.find(v => v.vendor_code === u.vendor_code || v.id === u.vendor_code);
                          return vendor ? (
                            <>{vendor.vendor_name} <span className="text-xs text-slate-400">({vendor.vendor_code})</span></>
                          ) : (
                            <span className="text-xs text-slate-400">{u.vendor_code || '-'}</span>
                          );
                        })()}
                      </td>
                    )}
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

export default UserManagement;
