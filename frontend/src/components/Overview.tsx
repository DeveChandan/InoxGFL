import { useState, useEffect } from 'react';
import api from '../api';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  TrendingUp, 
  AlertCircle,
  UserCheck
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: any;
  colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, description, icon: Icon, colorClass }) => (
  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.02)] flex items-start justify-between relative overflow-hidden transition-all hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
    <div className="space-y-2">
      <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</h3>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
    <div className={`p-3.5 rounded-xl ${colorClass} bg-opacity-10 text-opacity-100`}>
      <Icon size={24} className="stroke-[2.5]" />
    </div>
  </div>
);

const Overview = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/report/overview');
        setData(response.data);
      } catch (err: any) {
        console.error('Error fetching overview stats:', err);
        setError(err.response?.data?.message || 'Failed to fetch dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#007336] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium text-sm">Aggregating summary stats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50/50 border border-red-100 rounded-3xl p-8 text-center max-w-lg mx-auto my-12">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Metrics Fetch Failed</h3>
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-gradient-to-br from-[#007336] to-[#005c2b] text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Retry Load
        </button>
      </div>
    );
  }

  if (!data) return null;

  const role = data.role;
  const stats = data.stats;

  // Render role-specific content
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    const maxActive = Math.max(...(data.dailyActivity || []).map((d: any) => d.active), 1);
    
    return (
      <div className="space-y-8">
        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Registered Vendors" 
            value={stats.totalVendors} 
            description="Active corporate partners" 
            icon={Building2} 
            colorClass="bg-blue-500 text-blue-600"
          />
          <StatCard 
            title="Total Registered Users" 
            value={stats.totalUsers} 
            description="All platform staff & employees" 
            icon={Users} 
            colorClass="bg-indigo-500 text-indigo-600"
          />
          <StatCard 
            title="Active Today" 
            value={stats.todayActiveUsers} 
            description="Checked-in working employees" 
            icon={CheckCircle2} 
            colorClass="bg-green-500 text-[#007336]"
          />
          <StatCard 
            title="Not Started Today" 
            value={stats.todayInactiveUsers} 
            description="Yet to check-in for shift" 
            icon={Clock} 
            colorClass="bg-amber-500 text-amber-600"
          />
        </div>

        {/* Chart & Vendor Grid Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Trend Chart (CSS Bar Chart) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.01)] flex flex-col justify-between min-h-[360px]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[17px] font-bold text-slate-800">7-Day Attendance Trend</h4>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#007336] bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                  <TrendingUp size={13} />
                  <span>Real-time Active Count</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-6">Daily counts of unique checked-in users across all vendors</p>
            </div>

            <div className="flex items-end justify-between h-48 px-4 gap-2">
              {(data.dailyActivity || []).map((day: any, idx: number) => {
                const heightPercentage = Math.round((day.active / maxActive) * 100);
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm mb-1 pointer-events-none transform -translate-y-1">
                      {day.active} Active
                    </div>
                    <div 
                      style={{ height: `${Math.max(heightPercentage, 6)}%` }}
                      className="w-full bg-gradient-to-t from-[#005c2b] to-[#00a04d] rounded-t-lg transition-all duration-500 group-hover:opacity-90 shadow-sm relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[10px] font-semibold text-slate-400 tracking-wider">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vendors Quicklist Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.01)] flex flex-col max-h-[360px]">
            <h4 className="text-[17px] font-bold text-slate-800 mb-4">Vendor Directory</h4>
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {(data.vendorsList || []).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-8 text-center">No vendors registered.</p>
              ) : (
                (data.vendorsList || []).map((v: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50/65 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="overflow-hidden">
                      <p className="text-[13px] font-bold text-slate-800 truncate">{v.name}</p>
                      <p className="text-[11px] font-semibold text-slate-400 tracking-wider">CODE: {v.code}</p>
                    </div>
                    <div className="bg-[#007336]/10 text-[#007336] p-2 rounded-lg">
                      <Building2 size={15} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'VENDOR_ADMIN') {
    const maxActive = Math.max(...(data.dailyActivity || []).map((d: any) => d.active), 1);

    return (
      <div className="space-y-8">
        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard 
            title="My Company Users" 
            value={stats.totalUsers} 
            description="Employees assigned to your vendor" 
            icon={Users} 
            colorClass="bg-indigo-500 text-indigo-600"
          />
          <StatCard 
            title="Checked-in Today" 
            value={stats.todayActiveUsers} 
            description="Active employees working now" 
            icon={CheckCircle2} 
            colorClass="bg-green-500 text-[#007336]"
          />
          <StatCard 
            title="Not Checked-in" 
            value={stats.todayInactiveUsers} 
            description="Pending check-in for today" 
            icon={Clock} 
            colorClass="bg-amber-500 text-amber-600"
          />
        </div>

        {/* 7-Day Trend Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.01)] flex flex-col justify-between min-h-[360px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[17px] font-bold text-slate-800">My Team Performance</h4>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#007336] bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                <TrendingUp size={13} />
                <span>Active Attendance Trend</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-6">Daily checks of employees logging work under your vendor name</p>
          </div>

          <div className="flex items-end justify-between h-48 px-4 gap-2">
            {(data.dailyActivity || []).map((day: any, idx: number) => {
              const heightPercentage = Math.round((day.active / maxActive) * 100);
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm mb-1 pointer-events-none transform -translate-y-1">
                    {day.active} Active
                  </div>
                  <div 
                    style={{ height: `${Math.max(heightPercentage, 6)}%` }}
                    className="w-full bg-gradient-to-t from-[#005c2b] to-[#00a04d] rounded-t-lg transition-all duration-500 group-hover:opacity-90 shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[10px] font-semibold text-slate-400 tracking-wider">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // EMPLOYEE VIEW
  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard 
          title="Total Days Worked" 
          value={stats.totalDaysWorked} 
          description="Total active shifts logged" 
          icon={Calendar} 
          colorClass="bg-blue-500 text-blue-600"
        />
        <StatCard 
          title="Total Hours Logged" 
          value={`${stats.totalHoursWorked} hrs`} 
          description="Accumulated working hours" 
          icon={Clock} 
          colorClass="bg-indigo-500 text-indigo-600"
        />
        <StatCard 
          title="Average Shift" 
          value={`${stats.averageDailyHours} hrs`} 
          description="Average daily working time" 
          icon={TrendingUp} 
          colorClass="bg-green-500 text-[#007336]"
        />
      </div>

      {/* Grid: Check-in Status & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Punch Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.01)] flex flex-col justify-between min-h-[300px]">
          <div>
            <h4 className="text-[17px] font-bold text-slate-800 mb-1">Today's Check-in Card</h4>
            <p className="text-xs text-slate-400 mb-6">Track your active check-in/out times for today's shift</p>
          </div>

          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className={`p-4 rounded-full ${
              stats.todayStatus === 'checked-in' 
                ? 'bg-green-50 text-[#007336] animate-pulse' 
                : stats.todayStatus === 'checked-out'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-slate-50 text-slate-400'
            }`}>
              <UserCheck size={42} className="stroke-[1.75]" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
                {stats.todayStatus === 'checked-in' && 'Working Now'}
                {stats.todayStatus === 'checked-out' && 'Shift Completed'}
                {stats.todayStatus === 'not-started' && 'No Active Shift'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {stats.todayStatus === 'checked-in' && 'You clocked in successfully. Do not forget to clock out.'}
                {stats.todayStatus === 'checked-out' && 'Your timesheet for today has been closed.'}
                {stats.todayStatus === 'not-started' && 'Go to the Attendance tab to start your workday.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-center">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clock In</p>
              <p className="text-[14px] font-bold text-slate-700 mt-0.5">{stats.todayCheckIn}</p>
            </div>
            <div className="border-l border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clock Out</p>
              <p className="text-[14px] font-bold text-slate-700 mt-0.5">{stats.todayCheckOut}</p>
            </div>
          </div>
        </div>

        {/* Recent Shift Timeline */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.01)] flex flex-col max-h-[340px]">
          <h4 className="text-[17px] font-bold text-slate-800 mb-4">Recent Attendance Logs</h4>
          <div className="flex-1 overflow-y-auto pr-1">
            {(data.recentAttendance || []).length === 0 ? (
              <p className="text-xs text-slate-400 italic py-12 text-center">No shifts logged recently.</p>
            ) : (
              <div className="space-y-4">
                {(data.recentAttendance || []).map((log: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-800">
                          {new Date(log.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-400">
                          Punch: {log.clockIn} to {log.clockOut}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[13px] font-extrabold text-slate-700">{log.hours} hrs</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Worked</p>
                      </div>
                      
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        log.status === 'APPROVED' 
                          ? 'bg-green-50 border-green-200 text-[#007336]' 
                          : log.status === 'REJECTED' 
                          ? 'bg-red-50 border-red-200 text-red-600' 
                          : 'bg-amber-50 border-amber-200 text-amber-600'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Overview;
