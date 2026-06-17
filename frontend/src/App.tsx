import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const AccessDeniedScreen = ({ error }: { error: string }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      <div className="w-full max-w-[480px] bg-white rounded-3xl p-8 sm:p-10 shadow-[0_10px_40px_rgba(15,23,42,0.05)] border border-slate-100 text-center">
        {/* Lock/Security icon header */}
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_4px_12px_rgba(220,38,38,0.1)] animate-bounce">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        
        <h2 className="text-[26px] font-bold text-slate-900 mb-3 tracking-tight">
          Access Denied
        </h2>
        
        <p className="text-[14px] text-red-600 font-semibold bg-red-50/50 border border-red-100 rounded-xl px-4 py-3.5 mb-6 leading-relaxed">
          {error || 'You are not registered in the system. Please check your SAP BTP session.'}
        </p>

        <div className="bg-slate-50 rounded-2xl p-5 text-left border border-slate-100 mb-6">
          <h4 className="text-[13px] font-bold text-slate-800 mb-2.5 uppercase tracking-wider">
            Registration Required
          </h4>
          <ul className="text-[12.5px] text-slate-500 space-y-2.5 pl-4 list-disc leading-relaxed">
            <li>Your email address must be registered in the S/4HANA user master.</li>
            <li>If you are a vendor representative, ensure your vendor account status is set to Active.</li>
            <li>If this is an error, please coordinate with your administrator to set up your profile.</li>
          </ul>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="w-full py-3.5 bg-gradient-to-br from-[#007336] to-[#005c2b] text-white border-none rounded-xl text-[14px] font-bold cursor-pointer shadow-[0_4px_14px_rgba(0,115,54,0.25)] hover:opacity-90 active:translate-y-[1px] transition-all"
        >
          Retry Authentication
        </button>

        <p className="text-[11px] text-slate-400 mt-6 mb-0">
          © 2026 InoxGFL. All rights reserved.
        </p>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { isAuthenticated, loading, authError } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#007336] to-[#003d1c]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          <p className="text-white/80 font-medium text-sm tracking-wide">Verifying SAP BTP Session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    return (
      <Routes>
        {isLocalDev && <Route path="/login" element={<Login />} />}
        <Route path="*" element={<AccessDeniedScreen error={authError} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/dashboard/*" element={<Dashboard />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/index.html" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
