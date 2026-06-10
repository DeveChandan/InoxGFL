import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock, Filter, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const ApprovalDashboard = () => {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [track, setTrack] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Action State
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Reject Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null); // null means bulk reject

  useEffect(() => {
    fetchApprovals();
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') {
      fetchVendors();
    }
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await api.get('/vendor');
      setVendors(res.data.vendors || []);
    } catch (err) {
      console.error('Failed to fetch vendors');
    }
  };

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('start_date', startDate);
      if (endDate) queryParams.append('end_date', endDate);
      if (vendorId) queryParams.append('vendor_id', vendorId);
      if (employeeName) queryParams.append('employee_name', employeeName);
      if (track) queryParams.append('track', track);
      if (moduleFilter) queryParams.append('module', moduleFilter);

      const res = await api.get(`/approvals/pending?${queryParams.toString()}`);
      setApprovals(res.data.approvals || []);
      setSelectedIds([]); // Clear selection on fetch
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  // --- Individual Actions ---
  const handleAction = async (id: number, action: 'APPROVE' | 'REJECT', comments = '') => {
    setActioningId(id);
    try {
      await api.post(`/approvals/action/${id}`, { action, comments });
      setApprovals(approvals.filter(app => app.id !== id));
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${action}`);
    } finally {
      setActioningId(null);
    }
  };

  const confirmReject = () => {
    if (!rejectReason.trim()) return alert('Please provide a reason for rejection.');
    if (rejectTargetId !== null) {
      handleAction(rejectTargetId, 'REJECT', rejectReason);
    } else {
      executeBulkAction('REJECT', rejectReason);
    }
    setShowRejectModal(false);
    setRejectReason('');
    setRejectTargetId(null);
  };

  // --- Bulk Actions ---
  const toggleSelectAll = () => {
    if (selectedIds.length === approvals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(approvals.map(a => a.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const executeBulkAction = async (action: 'APPROVE' | 'REJECT', comments = '') => {
    if (selectedIds.length === 0) return;
    if (action === 'APPROVE' && !window.confirm(`Are you sure you want to APPROVE ${selectedIds.length} requests?`)) return;

    setIsProcessingBulk(true);
    try {
      await api.post('/approvals/bulk-action', { stepIds: selectedIds, action, comments });
      setApprovals(approvals.filter(app => !selectedIds.includes(app.id)));
      setSelectedIds([]);
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to bulk ${action}`);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkRejectClick = () => {
    setRejectTargetId(null); // Indicates bulk
    setRejectReason('');
    setShowRejectModal(true);
  };


  return (
    <div className="space-y-6 animate-fade-in relative">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Approvals</h1>
        <p className="text-slate-500 mt-2">Review and action the timesheets currently assigned to your level.</p>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">From Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm bg-slate-50" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">To Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm bg-slate-50" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Employee Name</label>
          <input type="text" placeholder="Search name..." value={employeeName} onChange={e => setEmployeeName(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 w-[140px]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Track</label>
          <select value={track} onChange={e => setTrack(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 w-[120px]">
            <option value="">All Tracks</option>
            <option value="S4HANA">S/4 HANA</option>
            <option value="MDM">MDM</option>
            <option value="QLIK_VIEW">Qlik View</option>
            <option value="RPA">RPA</option>
            <option value="TA">TA</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Module</label>
          <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 min-w-[120px]">
            <option value="">All Modules</option>
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
          </select>
        </div>
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Vendor</label>
            <select value={vendorId} onChange={e => setVendorId(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 min-w-[150px]">
              <option value="">All Vendors</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
            </select>
          </div>
        )}
        <button onClick={fetchApprovals} className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg font-semibold text-sm flex items-center transition-colors">
          <Filter className="w-4 h-4 mr-2" /> Filter
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-start shadow-sm">
          <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between shadow-sm animate-fade-in sticky top-4 z-10">
          <div className="text-blue-800 font-bold">
            {selectedIds.length} request(s) selected
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => executeBulkAction('APPROVE')} 
              disabled={isProcessingBulk}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors disabled:opacity-50 flex items-center"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> {isProcessingBulk ? 'Processing...' : 'Approve Selected'}
            </button>
            <button 
              onClick={handleBulkRejectClick} 
              disabled={isProcessingBulk}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors disabled:opacity-50 flex items-center"
            >
              <XCircle className="w-4 h-4 mr-2" /> Reject Selected
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500">Loading pending approvals...</div>
      ) : approvals.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">All Caught Up!</h3>
          <p className="text-slate-500">You have no pending timesheets matching your criteria.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">
                    <button onClick={toggleSelectAll} className="text-slate-400 hover:text-primary transition-colors">
                      {selectedIds.length === approvals.length ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                    </button>
                  </th>
                  <th className="p-4 font-semibold">Actions</th>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Employee</th>
                  <th className="p-4 font-semibold">Project Details</th>
                  <th className="p-4 font-semibold">Vendor</th>
                  <th className="p-4 font-semibold">Timing</th>
                  <th className="p-4 font-semibold">Hours</th>
                  <th className="p-4 font-semibold">Location</th>
                  <th className="p-4 font-semibold">System Info</th>
                  <th className="p-4 font-semibold">Exception</th>
                  <th className="p-4 font-semibold max-w-xs">Tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {approvals.map((app) => (
                  <tr key={app.id} className={`transition-colors ${selectedIds.includes(app.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                    <td className="p-4 text-center cursor-pointer" onClick={() => toggleSelect(app.id)}>
                      {selectedIds.includes(app.id) ? (
                        <CheckSquare className="w-5 h-5 text-primary mx-auto" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAction(app.id, 'APPROVE')}
                          disabled={actioningId === app.id || isProcessingBulk}
                          className="inline-flex items-center px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> Approve
                        </button>
                        <button
                          onClick={() => {
                            setRejectTargetId(app.id);
                            setRejectReason('');
                            setShowRejectModal(true);
                          }}
                          disabled={actioningId === app.id || isProcessingBulk}
                          className="inline-flex items-center px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center text-slate-700 font-medium whitespace-nowrap">
                        <Clock className="w-4 h-4 mr-2 text-slate-400" />
                        {new Date(app.attendance.work_date).toLocaleDateString('en-GB')}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900 whitespace-nowrap">{app.attendance.user.name}</p>
                      <p className="text-sm text-slate-500">{app.attendance.user.email}</p>
                    </td>
                    <td className="p-4">
                      <div className="inline-flex flex-col">
                        <span className="text-sm font-semibold text-primary whitespace-nowrap">{app.attendance.user.track} / {app.attendance.user.module}</span>
                        <span className="text-xs text-slate-500 mt-1 whitespace-nowrap">Role: {app.attendance.user.vendor_role}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700 text-sm whitespace-nowrap">
                      {app.attendance.user.vendor?.vendor_name || '-'}
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-slate-600 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">In:</span> {new Date(app.attendance.clock_in_time).toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit'})}
                      </div>
                      {app.attendance.clock_out_time && (
                        <div className="text-xs text-slate-600 whitespace-nowrap mt-1">
                          <span className="font-semibold text-slate-800">Out:</span> {new Date(app.attendance.clock_out_time).toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit'})}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                        {app.attendance.hours_worked} hrs
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-600">
                      {app.attendance.manual_location || '-'}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="text-[10px] text-slate-500 font-mono">
                        IP: {app.attendance.ip_address || '-'}<br/>
                        OS: {app.attendance.os_system || '-'}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {app.attendance.is_exception ? (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-bold uppercase">Yes</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">No</span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-xs text-slate-600 line-clamp-3 min-w-[150px]">
                        {app.attendance.worksheet?.tasks_description || '-'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-scale-in">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {rejectTargetId === null ? `Reject ${selectedIds.length} Requests` : 'Reject Request'}
            </h3>
            <p className="text-sm text-slate-600 mb-4">Please provide a reason for rejection. This will be visible to the employee(s).</p>
            <textarea
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none min-h-[100px] mb-6"
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRejectModal(false)} className="px-5 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={confirmReject} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-sm">
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalDashboard;
