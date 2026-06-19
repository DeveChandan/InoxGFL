import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Clock, BarChart3, LogOut, Menu, X, Building2, Users, Settings } from 'lucide-react';

import ClockInOut from '../components/ClockInOut';
import MISReport from '../components/MISReport';
import VendorManagement from '../components/VendorManagement';
import UserManagement from '../components/UserManagement';
import ApprovalDashboard from '../components/ApprovalDashboard';
import ApprovalMatrixAdmin from '../components/ApprovalMatrixAdmin';
import Overview from '../components/Overview';
import { CheckSquare } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'VENDOR_ADMIN', 'EMPLOYEE'] },
    { id: 'vendors', label: 'Vendors', icon: Building2, roles: ['SUPER_ADMIN'] },
    { id: 'users', label: 'Employees / Users', icon: Users, roles: ['SUPER_ADMIN', 'VENDOR_ADMIN'] },
    { id: 'attendance', label: 'Attendance', icon: Clock, roles: ['EMPLOYEE', 'VENDOR_ADMIN'] },
    { id: 'approvals', label: 'My Approvals', icon: CheckSquare, roles: ['SUPER_ADMIN', 'ADMIN', 'VENDOR_ADMIN', 'EMPLOYEE'] },
    { id: 'matrix_admin', label: 'Approval Matrix', icon: Settings, roles: ['SUPER_ADMIN'] },
    { id: 'reports', label: 'MIS Reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN', 'VENDOR_ADMIN', 'EMPLOYEE'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden glass-panel p-4 flex justify-between items-center z-20">
        <img src="https://www.inoxgfl.com/images/logo.png" alt="InoxGFL" className="h-8 object-contain" />
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-900">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-64 glass-panel border-r border-slate-200 z-10 absolute md:sticky md:top-0 h-[calc(100vh-60px)] md:h-screen transition-all duration-300`}>
        <div className="p-6 hidden md:block">
          <img src="https://www.inoxgfl.com/images/logo.png" alt="InoxGFL" className="h-10 object-contain" />
          <p className="text-xs text-slate-500 mt-2 uppercase tracking-wider font-semibold">{user?.vendor}</p>
        </div>

        <div className="flex-1 px-4 py-4 space-y-2">
          {filteredNav.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                activeTab === item.id 
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <item.icon className={`mr-3 h-5 w-5 ${activeTab === item.id ? 'text-primary' : ''}`} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-lg shadow-sm border border-slate-200">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || user?.email || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors font-medium"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary opacity-[0.03] rounded-full blur-3xl pointer-events-none"></div>
        <div className="p-4 md:p-8 relative z-10">
          <header className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {activeTab === 'overview' && `Welcome back, ${(user?.name || user?.email || 'User').split(' ')[0]}`}
              {activeTab === 'vendors' && 'Vendor Management'}
              {activeTab === 'users' && 'Employee & User Management'}
              {activeTab === 'attendance' && 'Daily Attendance'}
              {activeTab === 'reports' && 'Management Information System'}
            </h2>
            <p className="text-slate-500">
              {activeTab === 'overview' && 'Here is what is happening today.'}
              {activeTab === 'vendors' && 'Add and manage registered vendor companies.'}
              {activeTab === 'users' && 'Manage your staff, field employees, and consulting teams.'}
              {activeTab === 'attendance' && 'Manage your shift and submit your daily worksheet.'}
              {activeTab === 'approvals' && 'Review and action pending timesheets.'}
              {activeTab === 'matrix_admin' && 'Configure the multi-level approval routing rules.'}
              {activeTab === 'reports' && 'View detailed operational reports and logs.'}
            </p>
          </header>

          {/* Dynamic Content Rendering */}
          <div className="animate-fade-in-up">
            {activeTab === 'overview' && <Overview />}
            
            {activeTab === 'vendors' && user?.role === 'SUPER_ADMIN' && <VendorManagement />}
            
            {activeTab === 'users' && (user?.role === 'SUPER_ADMIN' || user?.role === 'VENDOR_ADMIN') && <UserManagement />}
            
            {activeTab === 'attendance' && (user?.role === 'EMPLOYEE' || user?.role === 'VENDOR_ADMIN') && <ClockInOut />}
            
            {activeTab === 'approvals' && <ApprovalDashboard />}
            
            {activeTab === 'matrix_admin' && user?.role === 'SUPER_ADMIN' && <ApprovalMatrixAdmin />}
            
            {activeTab === 'reports' && <MISReport />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
