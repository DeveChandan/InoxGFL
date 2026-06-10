import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { LogIn, Lock, Mail } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/auth/login', { email, password });
      login(response.data.user, response.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* ── LEFT PANEL — InoxGFL Green ── */}
      <div className="w-full lg:w-[55%] bg-gradient-to-br from-[#007336] via-[#005c2b] to-[#003d1c] flex flex-col items-center justify-center p-8 lg:p-10 relative overflow-hidden min-h-[30vh] lg:min-h-screen">
        {/* Background decorative circles */}
        <div className="absolute -top-[8%] -right-[8%] w-[340px] h-[340px] bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute -bottom-[6%] -left-[8%] w-[240px] h-[240px] bg-black/10 rounded-full pointer-events-none" />
        <div className="absolute top-[40%] -left-[4%] w-[160px] h-[160px] bg-white/5 rounded-full pointer-events-none" />

        {/* Logo & Content */}
        <div className="relative z-10 w-full max-w-[480px] text-center">
          <h1 className="text-white text-2xl lg:text-[32px] font-bold mb-3 leading-tight">
            Welcome to InoxGFL Portal
          </h1>
          
          <p className="text-white/85 text-sm lg:text-base leading-relaxed max-w-[400px] mx-auto mb-6">
            Streamline operations, manage attendance & securely track your team's worksheets — all in one place.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[400px] mx-auto text-left">
            {[
              '📊 Dashboard Analytics',
              '✅ Attendance Tracking',
              '📋 Worksheet Management',
              '🔒 Secure Access'
            ].map((feature, idx) => (
              <div key={idx} className="bg-white/10 rounded-[10px] py-2.5 px-3.5 text-white/90 text-[13px] font-medium backdrop-blur-sm border border-white/5">
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login Form ── */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 lg:p-10 bg-slate-50 flex-grow">
        <div className="w-full max-w-[400px] bg-white rounded-[20px] p-6 sm:p-8 lg:p-9 shadow-[0_8px_40px_rgba(0,0,0,0.08)]">

          {/* Form header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-[#007336] to-[#00a04d] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_4px_14px_rgba(0,115,54,0.35)]">
              <LogIn size={24} color="white" />
            </div>
            <h2 className="text-[26px] font-bold text-slate-900 mb-1.5">
              Sign In
            </h2>
            <p className="text-[13px] text-slate-500 m-0">
              Enter your credentials to access your account
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-[10px] py-2.5 px-3.5 mb-5 text-[13px] font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="mb-4">
              <label className="block text-[13px] font-semibold text-slate-700 mb-1.5 text-left">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Mail size={17} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@inoxgfl.com"
                  className="w-full py-3 pr-3.5 pl-[42px] border-[1.5px] border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50 outline-none transition-colors focus:border-[#007336]"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="block text-[13px] font-semibold text-slate-700 mb-1.5 text-left">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock size={17} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-3 pr-3.5 pl-[42px] border-[1.5px] border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50 outline-none transition-colors focus:border-[#007336]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 mt-2 bg-gradient-to-br from-[#007336] to-[#005c2b] text-white border-none rounded-xl text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(0,115,54,0.35)] transition-all hover:opacity-90 hover:-translate-y-[1px]"
            >
              <LogIn size={18} />
              Login to Dashboard
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center text-[11px] text-slate-400 mt-6 mb-0">
            © 2026 InoxGFL. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;