import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ShieldCheck, Edit2 } from 'lucide-react';
import api from '../api';

const ApprovalMatrixAdmin = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Rule Form
  const [vendorId, setVendorId] = useState('');
  const [role, setRole] = useState('CTM');
  const [track, setTrack] = useState('ALL');
  const [module, setModule] = useState('');
  const [level, setLevel] = useState('1');
  const [approverId, setApproverId] = useState('');
  const [approverType, setApproverType] = useState('ML');
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [matrixRes, vendorRes, userRes] = await Promise.all([
        api.get('/approvals/matrix'),
        api.get('/vendor'),
        api.get('/user')
      ]);
      setRules(matrixRes.data.rules || []);
      setVendors(vendorRes.data.vendors || []);
      setUsers(userRes.data.users || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load matrix data. Are you a Super Admin?');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        vendor_id: vendorId,
        employee_role: role,
        track,
        module,
        level: parseInt(level),
        approver_id: approverId,
        approver_type: approverType
      };

      if (editingId) {
        await api.put(`/approvals/matrix/${editingId}`, payload);
        setEditingId(null);
      } else {
        await api.post('/approvals/matrix', payload);
      }
      
      fetchData();
      
      if (!editingId) {
        setLevel((parseInt(level) + 1).toString());
        setApproverId('');
      }
    } catch (err) {
      alert(editingId ? 'Failed to update rule' : 'Failed to add rule');
    }
  };

  const handleEdit = (rule: any) => {
    setEditingId(rule.id);
    setVendorId(rule.vendor_id.toString());
    setRole(rule.employee_role);
    setTrack(rule.track || 'ALL');
    setModule(rule.module || '');
    setLevel(rule.level.toString());
    setApproverId(rule.approver_id.toString());
    setApproverType(rule.approver_type);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setVendorId('');
    setRole('CTM');
    setTrack('ALL');
    setModule('');
    setLevel('1');
    setApproverId('');
    setApproverType('ML');
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      await api.delete(`/approvals/matrix/${id}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete rule');
    }
  };

  if (loading) return <div className="text-slate-500">Loading Matrix Admin...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center space-x-3">
        <ShieldCheck className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Approval Matrix Admin</h1>
          <p className="text-slate-500">Define the exact approval routing hierarchy for every scenario.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
          {editingId ? <Edit2 className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />} 
          {editingId ? 'Edit Level Rule' : 'Add New Level Rule'}
        </h3>
        <form onSubmit={handleAddRule} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Vendor</label>
            <select required value={vendorId} onChange={e => setVendorId(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <option value="">Select Vendor</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Employee Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <option value="CTM">CTM</option>
              <option value="ML">ML</option>
              <option value="SME">SME</option>
              <option value="PMO">PMO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Track</label>
            <select value={track} onChange={e => setTrack(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <option value="ALL">ALL Tracks (Wildcard)</option>
              <option value="S4HANA">S/4 HANA</option>
              <option value="MDM">MDM</option>
              <option value="QLIK_VIEW">Qlik View</option>
              <option value="RPA">RPA</option>
              <option value="TA">TA</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Module</label>
            <input type="text" value={module} onChange={e => setModule(e.target.value)} placeholder="Leave blank for ALL modules" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Level (1, 2, 3...)</label>
            <input required type="number" min="1" value={level} onChange={e => setLevel(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Approver (User ID)</label>
            <select required value={approverId} onChange={e => setApproverId(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <option value="">Select User</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Approver Role Type</label>
            <input required type="text" value={approverType} onChange={e => setApproverType(e.target.value)} placeholder="e.g. Track Lead" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg" />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2.5 rounded-lg transition-colors">
              {editingId ? 'Update Rule' : 'Save Rule'}
            </button>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2.5 rounded-lg transition-colors">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4">Vendor</th>
              <th className="p-4">Track/Module</th>
              <th className="p-4">Role</th>
              <th className="p-4">Level</th>
              <th className="p-4">Approver</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rules.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 text-sm">
                <td className="p-4 font-semibold text-slate-800">{r.vendor.vendor_name}</td>
                <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md">{r.track || 'ALL'} - {r.module || 'ALL'}</span></td>
                <td className="p-4 text-slate-600">{r.employee_role}</td>
                <td className="p-4 font-mono font-bold text-slate-700">L{r.level}</td>
                <td className="p-4">
                  <span className="font-semibold">{r.approver.name}</span> <span className="text-slate-400 text-xs">({r.approver_type})</span>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => handleEdit(r)} className="text-blue-500 hover:text-blue-700 p-1 mr-2" title="Edit Rule">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700 p-1" title="Delete Rule">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ApprovalMatrixAdmin;
