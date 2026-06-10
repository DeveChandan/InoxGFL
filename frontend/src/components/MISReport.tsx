import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Search, Download, Calendar, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

const MISReport = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Date Filters
  const today = new Date().toISOString().split('T')[0];
  const lastWeek = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(lastWeek);
  const [endDate, setEndDate] = useState(today);
  const [monthPicker, setMonthPicker] = useState('');

  // Search Filters
  const [empName, setEmpName] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'date' | 'user'>('none');

  const fetchReport = async (currentPage = page) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(empName && { emp_name: empName }),
        ...(vendorCode && { vendor_code: vendorCode })
      });
      
      const res = await api.get(`/report?${queryParams.toString()}`);
      
      // Backend now handles all role-based isolation securely.
      // We no longer need to filter `res.data.data` in the frontend!
      setReportData(res.data.data || []);
      setTotalCount(res.data.totalCount || 0);
      setPage(currentPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(1);
  }, []);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // Format: YYYY-MM
    setMonthPicker(val);
    if (val) {
      const [year, month] = val.split('-');
      const firstDay = new Date(Number(year), Number(month) - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  };
  
  const handleApplyFilters = () => {
    fetchReport(1); // Reset to page 1 on new filter
  };

  const exportToExcel = async () => {
    if (totalCount === 0) return;
    
    // For Excel export of potentially 10M records, we request ALL records matching the current date filters.
    // WARNING: If this is too large, the backend will still limit it to what Node can hold in memory.
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        fetchAll: 'true',
        ...(empName && { emp_name: empName }),
        ...(vendorCode && { vendor_code: vendorCode })
      });
      const res = await api.get(`/report?${queryParams.toString()}`);
      const fullData = res.data.data || [];

      // Flatten and format data for Excel export with better readability and structure  
      const excelData = fullData.map((row: any) => ({
        Date: new Date(row.work_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
        Employee: row.user?.name || 'N/A',
        Email:row.user?.email||'N/A',
        'Vendor Code': row.user?.vendor?.vendor_code || 'N/A',
        'Vendor Name': row.user?.vendor?.vendor_name || 'N/A',
        'Clock In': formatTime(row.clock_in_time),
        'Clock Out': formatTime(row.clock_out_time),
        'Total Hours': row.hours_worked || '-',
        'Status': row.status,
        'Approval Status': row.overall_approval_status,
        'Exception': row.is_exception ? 'Yes' : 'No',
        'Location': row.manual_location || row.readable_location || row.hidden_location || '-',
        'IP Address': row.ip_address || '-',
        'OS System': row.os_system || '-',
        'Tasks': row.worksheet?.tasks_description || '-'
      }));
    
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "MIS_Report");
      XLSX.writeFile(workbook, `MIS_Report_${startDate}_to_${endDate}.xlsx`);
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export. The dataset might be too large.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  };
  
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      {/* Advanced Filters */}
      <div className="glass-panel bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold text-lg">
          <Filter className="w-5 h-5 text-primary" />
          Report Filters
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Month</label>
            <input 
              type="month" 
              value={monthPicker}
              onChange={handleMonthChange}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-2.5 focus:ring-2 focus:ring-primary outline-none shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-2.5 focus:ring-2 focus:ring-primary outline-none shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">End Date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-2.5 focus:ring-2 focus:ring-primary outline-none shadow-sm"
            />
          </div>
          
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'VENDOR_ADMIN') && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Employee Name</label>
              <input 
                type="text" 
                placeholder="Search name..."
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-2.5 focus:ring-2 focus:ring-primary outline-none shadow-sm"
              />
            </div>
          )}

          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Vendor Code</label>
              <input 
                type="text" 
                placeholder="e.g. V-101"
                value={vendorCode}
                onChange={(e) => setVendorCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-2.5 focus:ring-2 focus:ring-primary outline-none shadow-sm"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between items-center mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-600">Group By:</span>
              <select 
                value={groupBy} 
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none shadow-sm cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <option value="none">None (Flat List)</option>
                <option value="date">Date</option>
                <option value="user">Employee</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-600">Records per page:</span>
              <select 
                value={limit} 
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  fetchReport(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none shadow-sm cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handleApplyFilters}
              className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg border border-transparent shadow-sm transition-colors flex items-center justify-center font-medium"
            >
              <Search className="w-4 h-4 mr-2" />
              Apply Filters
            </button>
            
            <button 
              onClick={exportToExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg shadow-sm transition-colors flex items-center justify-center font-medium"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Date</th>
                {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'VENDOR_ADMIN') && (
                  <th className="p-4 font-semibold">Employee</th>
                )}
                {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                  <th className="p-4 font-semibold">Vendor</th>
                )}
                <th className="p-4 font-semibold">Timing</th>
                <th className="p-4 font-semibold">Hours</th>
                <th className="p-4 font-semibold">Location</th>
                <th className="p-4 font-semibold">System Info</th>
                <th className="p-4 font-semibold">Approval Status</th>
                <th className="p-4 font-semibold">Exception</th>
                <th className="p-4 font-semibold max-w-xs">Tasks</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {(() => {
                if (loading) return <tr><td colSpan={10} className="p-8 text-center text-slate-500 font-medium">Loading securely paginated data...</td></tr>;
                if (reportData.length === 0) return <tr><td colSpan={10} className="p-8 text-center text-slate-500 font-medium">No records found for this period.</td></tr>;

                const renderRow = (row: any) => (
                  <tr key={`${row.work_date}_${row.user?.email || row.id}`} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-slate-900 font-medium">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        {formatDate(row.work_date)}
                      </div>
                      <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        row.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {row.status.toUpperCase()}
                      </span>
                    </td>
                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'VENDOR_ADMIN') && (
                      <td className="p-4 text-slate-700">
                        <div className="font-bold text-slate-900">{row.user?.name}</div>
                        <div className="text-xs text-slate-500">{row.user?.email}</div>
                      </td>
                    )}
                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                      <td className="p-4 text-slate-700">
                        <span className="bg-slate-100 text-xs px-2 py-1 rounded border border-slate-200 font-medium text-slate-600">
                          {row.user?.vendor?.vendor_name || 'N/A'}
                        </span>
                      </td>
                    )}
                    <td className="p-4 text-slate-700 whitespace-nowrap">
                      <div className="text-emerald-600 font-mono font-medium text-xs mb-1">IN: {formatTime(row.clock_in_time)}</div>
                      <div className="text-orange-600 font-mono font-medium text-xs">OUT: {formatTime(row.clock_out_time)}</div>
                    </td>
                    <td className="p-4 text-slate-800 font-bold">
                      {row.hours_worked ? `${row.hours_worked}h` : '-'}
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-slate-700 font-medium truncate max-w-[150px]" title={row.manual_location || row.readable_location || row.hidden_location}>
                        {row.manual_location || row.readable_location || 'Unknown'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-slate-500">IP: {row.ip_address || '-'}</div>
                      <div className="text-xs text-slate-500">OS: {row.os_system || '-'}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[150px]" title={row.readable_location}>Addr: {row.readable_location || '-'}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        row.overall_approval_status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        row.overall_approval_status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {row.overall_approval_status || 'PENDING'}
                      </span>
                      {row.overall_approval_status === 'PENDING' && row.approval_steps && row.approval_steps.length > 0 && (
                          <div className="text-[10px] text-slate-500 mt-1.5 font-medium bg-slate-100 px-2 py-0.5 rounded inline-block">
                            L{row.approval_steps[0].level} - {row.approval_steps[0].approver?.name}
                          </div>
                        )}
                    </td>
                    <td className="p-4">
                      {row.is_exception ? (
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded border border-red-200 font-semibold">YES</span>
                      ) : (
                        <span className="text-slate-400 text-xs font-medium">NO</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 text-xs max-w-[200px] truncate" title={row.worksheet?.tasks_description}>
                      {row.worksheet ? row.worksheet.tasks_description : '-'}
                    </td>
                  </tr>
                );

                if (groupBy === 'none') {
                  return reportData.map(renderRow);
                }

                const groupKeyFn = groupBy === 'date' 
                  ? (r: any) => formatDate(r.work_date)
                  : (r: any) => `${r.user?.name || 'Unknown'} (${r.user?.vendor?.vendor_code || 'No Vendor'})`;

                const groupedData = reportData.reduce((acc, row) => {
                  const key = groupKeyFn(row);
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(row);
                  return acc;
                }, {} as Record<string, any[]>);

                return Object.entries(groupedData).map(([groupName, rows]: [string, any]) => (
                  <React.Fragment key={groupName}>
                    <tr className="bg-slate-100/80 border-b border-slate-200">
                      <td colSpan={10} className="p-3 px-4 font-bold text-slate-800 text-sm">
                        {groupBy === 'date' ? 'Date: ' : 'Employee: '} <span className="text-primary">{groupName}</span>
                        <span className="ml-2 text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{rows.length} records</span>
                      </td>
                    </tr>
                    {rows.map(renderRow)}
                  </React.Fragment>
                ));
              })()}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {!loading && totalCount > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
            <div className="text-sm text-slate-600 font-medium">
              Showing <span className="font-bold text-slate-900">{((page - 1) * limit) + 1}</span> to <span className="font-bold text-slate-900">{Math.min(page * limit, totalCount)}</span> of <span className="font-bold text-slate-900">{totalCount}</span> entries
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fetchReport(page - 1)}
                disabled={page === 1}
                className={`p-2 rounded-lg border flex items-center justify-center transition-colors ${
                  page === 1 ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed' : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-100 hover:border-slate-400'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show pages around current page
                  let pageNum = page;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchReport(pageNum)}
                      className={`w-9 h-9 rounded-lg border text-sm font-semibold transition-colors flex items-center justify-center ${
                        page === pageNum 
                          ? 'bg-primary text-white border-primary shadow-sm' 
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && page < totalPages - 2 && (
                  <>
                    <span className="text-slate-400 px-1">...</span>
                    <button
                      onClick={() => fetchReport(totalPages)}
                      className="w-9 h-9 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-semibold flex items-center justify-center transition-colors"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              
              <button 
                onClick={() => fetchReport(page + 1)}
                disabled={page >= totalPages}
                className={`p-2 rounded-lg border flex items-center justify-center transition-colors ${
                  page >= totalPages ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed' : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-100 hover:border-slate-400'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MISReport;
