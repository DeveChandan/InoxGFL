import React, { useState, useEffect } from 'react';
import api from '../api';
import { Play, CheckCircle, AlertCircle } from 'lucide-react';

const ClockInOut = () => {
  const [status, setStatus] = useState<'not_started' | 'working' | 'completed'>('not_started');
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isClockingIn, setIsClockingIn] = useState(false);
  
  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Worksheet Form State
  const [showWorksheet, setShowWorksheet] = useState(false);
  const [tasks, setTasks] = useState('');
  const [manualLocation, setManualLocation] = useState('');

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/attendance/status');
      setStatus(res.data.status);
      setAttendance(res.data.attendance);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    setError('');
    setIsClockingIn(true);
    
    const os_system = navigator.platform || navigator.userAgent;

    // Start IP fetch immediately to not block location gathering
    const ipPromise = fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => data.ip)
      .catch(() => 'Unknown');

    if (navigator.geolocation) {
      // Force highest accuracy with maximumAge: 0
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const hidden_location = `${lat}, ${lon}`;
          
          // Wait for IP to resolve (should be fast since it ran in parallel)
          const ip_address = await ipPromise;
          
          let readable_location = hidden_location;

          // Attempt fast reverse geocoding with strict timeout
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500); // Only wait 2.5 seconds
            
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (nomRes.ok) {
              const data = await nomRes.json();
              if (data.display_name) {
                readable_location = data.display_name;
              }
            }
          } catch (e) {
            console.log('Reverse geocoding timed out or failed, falling back to coordinates for speed.');
          }

          executeClockIn(ip_address, os_system, hidden_location, readable_location);
        },
        (error) => {
          console.log('Geolocation error:', error);
          let errMsg = 'Please allow location access to clock in.';
          
          if (!window.isSecureContext) {
            errMsg = 'Chrome blocks location access on insecure HTTP connections. You must use localhost or HTTPS to share your location.';
          } else if (error.code === error.PERMISSION_DENIED) {
            errMsg = 'Location access denied. Please allow location access in your browser settings to clock in.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errMsg = 'Location information is unavailable on this device. Please ensure GPS/Location services are turned on in your OS.';
          } else if (error.code === error.TIMEOUT) {
            errMsg = 'Location request timed out. Please try again.';
          }
          
          setError(errMsg);
          setIsClockingIn(false);
        },
        { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 } // Force 100% accuracy, no cache
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      setIsClockingIn(false);
    }
  };

  const executeClockIn = async (ip_address: string, os_system: string, hidden_location: string, readable_location: string) => {
    try {
      await api.post('/attendance/clock-in', {
        task: 'Daily Shift',
        ip_address,
        os_system,
        hidden_location,
        readable_location,
        manual_location: '',
        mac_address: 'N/A (Web Browser)'
      });
      await fetchStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to clock in');
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleClockOutAttempt = async (loc?: string) => {
    setError('');
    try {
      const payload = typeof loc === 'string' ? { manual_location: loc } : {};
      await api.post('/attendance/clock-out', payload);
      await fetchStatus();
    } catch (err: any) {
      if (err.response?.data?.requiresWorksheet) {
        setShowWorksheet(true);
      } else {
        setError(err.response?.data?.message || 'Failed to clock out');
      }
    }
  };

  const submitWorksheet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsClockingIn(true); // Re-use the loading state to show progress
    try {
      // hours_spent is now calculated automatically on the backend
      await api.post('/worksheet/submit', { tasks_description: tasks });
      setShowWorksheet(false);
      
      // Delay clock-out slightly to ensure S/4HANA has fully committed the worksheet to the database
      setTimeout(() => {
        handleClockOutAttempt(manualLocation);
        setIsClockingIn(false);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit worksheet');
      setIsClockingIn(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' });
  };

  const calculateDuration = (start: string, end: Date | string) => {
    const startTime = new Date(start).getTime();
    const endTime = typeof end === 'string' ? new Date(end).getTime() : end.getTime();
    
    const diff = endTime - startTime;
    if (diff < 0) return '0h 0m 0s';
    
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  if (loading) return <div className="text-slate-500">Loading status...</div>;

  return (
    <div className="space-y-6">
      
      {/* Live Clock Header */}
      <div className="glass-panel bg-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between border-l-4 border-primary">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Current Time</h3>
          <p className="text-slate-500 text-sm">{currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}</p>
        </div>
        <div className="text-3xl font-mono font-bold text-primary mt-2 md:mt-0 bg-slate-50 px-6 py-2 rounded-xl border border-slate-200">
          {formatTime(currentTime)}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-start shadow-sm">
          <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {status === 'not_started' && (
        <div className="glass-panel bg-white p-8 rounded-2xl text-center shadow-sm animate-fade-in-up">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Play className="w-10 h-10 text-primary ml-1" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Ready to Start?</h3>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">Your shift hasn't started yet. Click the button below to clock in and begin recording your time.</p>
          <button 
            onClick={handleClockIn}
            disabled={isClockingIn}
            className={`bg-primary hover:bg-primary-hover text-white font-bold py-4 px-10 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center mx-auto ${isClockingIn ? 'opacity-80 cursor-wait' : 'transform hover:scale-105'}`}
          >
            {isClockingIn ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Locating & Clocking In...
              </>
            ) : 'Clock In'}
          </button>
          {isClockingIn && (
            <p className="text-sm text-primary mt-6 animate-pulse font-medium">Please wait while we securely record your location and start your shift...</p>
          )}
        </div>
      )}

      {status === 'working' && !showWorksheet && (
        <div className="glass-panel bg-white p-8 rounded-2xl text-center border border-yellow-200 shadow-sm relative overflow-hidden animate-fade-in-up">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-400"></div>
          
          <div className="flex flex-col md:flex-row justify-center items-center gap-8 mb-8 mt-4">
            <div className="text-center">
              <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">Clocked In At</p>
              <p className="text-xl font-bold text-slate-800">
                {attendance?.clock_in_time ? formatTime(new Date(attendance.clock_in_time)) : '--:--'}
              </p>
            </div>
            
            <div className="hidden md:block w-px h-12 bg-slate-200"></div>
            
            <div className="text-center">
              <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">Duration</p>
              <p className="text-2xl font-mono font-bold text-yellow-600">
                {attendance?.clock_in_time ? calculateDuration(attendance.clock_in_time, currentTime) : '0h 0m 0s'}
              </p>
            </div>
          </div>

          <div className="mb-8 flex flex-col items-center justify-center space-y-4">
            {(attendance?.hidden_location || attendance?.readable_location) && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 w-full max-w-md mx-auto text-left shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Clock In Location</p>
                {attendance?.readable_location && (
                  <p className="text-sm text-slate-800 font-medium">
                    {attendance.readable_location}
                  </p>
                )}
                {attendance?.hidden_location && (
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    Coordinates: {attendance.hidden_location}
                  </p>
                )}
              </div>
            )}
            <p className="text-slate-500 max-w-md mx-auto">
              You are currently clocked in. When you are done for the day, click below to clock out.
            </p>
          </div>
          <button 
            onClick={() => handleClockOutAttempt()}
            className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-4 px-10 rounded-xl border border-slate-300 shadow-sm transition-all"
          >
            End Shift & Clock Out
          </button>
        </div>
      )}

      {showWorksheet && (
        <div className="glass-panel bg-white p-8 rounded-2xl border border-primary/20 shadow-md relative animate-fade-in-up">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-400"></div>
           <h3 className="text-2xl font-bold text-slate-900 mb-2">Daily Worksheet Required</h3>
           <p className="text-slate-500 mb-6">You must submit your task report for today before the system will allow you to clock out.</p>
           
           <form onSubmit={submitWorksheet} className="space-y-6 text-left">
              <div>
               <label className="block text-sm font-semibold text-slate-700 mb-2">Tasks Completed Today</label>
               <textarea 
                 required
                 maxLength={255}
                 rows={4}
                 value={tasks}
                 onChange={(e) => setTasks(e.target.value)}
                 className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-slate-900 placeholder-slate-400"
                 placeholder="Describe what you worked on (Max 255 chars)..."
               ></textarea>
               <p className="text-xs text-right text-slate-400 mt-1">{tasks.length}/255</p>
             </div>
             
             <div>
               <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
               <select 
                 required
                 value={manualLocation}
                 onChange={(e) => setManualLocation(e.target.value)}
                 className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-slate-900"
               >
                 <option value="" disabled>Select Location</option>
                 <option value="Dahej-A">Dahej-A</option>
                 <option value="Dahej-B">Dahej-B</option>
                 <option value="Ranjit Nagar">Ranjit Nagar</option>
                 <option value="Noida">Noida</option>
                 <option value="Vadodara">Vadodara</option>
                 <option value="Remote Work">Remote Work</option>
               </select>
             </div>
             
             <div>
               <label className="block text-sm font-semibold text-slate-700 mb-2">Total Hours Spent</label>
               <input 
                 type="text"
                 disabled
                 value="Calculated Automatically"
                 className="w-full p-4 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-500 cursor-not-allowed"
               />
               <p className="text-xs text-slate-400 mt-1">Your hours will be automatically calculated when you clock out.</p>
             </div>
             
             <div className="flex space-x-4 pt-2">
                <button 
                  type="submit"
                  disabled={isClockingIn}
                  className={`flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-primary/20 transition-all flex justify-center items-center ${isClockingIn ? 'opacity-80 cursor-wait' : ''}`}
                >
                  {isClockingIn ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : 'Submit & Clock Out'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowWorksheet(false)}
                  className="flex-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all shadow-sm"
                >
                  Cancel
                </button>
             </div>
           </form>
        </div>
      )}

      {status === 'completed' && (
        <div className="glass-panel bg-white p-8 rounded-2xl text-center border border-green-200 shadow-sm relative overflow-hidden animate-fade-in-up">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-400"></div>
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Shift Completed</h3>
          
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 inline-flex flex-col items-center mb-6">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Work Duration</p>
            <p className="text-3xl font-mono font-bold text-emerald-600">
              {attendance?.clock_in_time && attendance?.clock_out_time 
                ? calculateDuration(attendance.clock_in_time, new Date(attendance.clock_out_time)) 
                : '--'}
            </p>
          </div>
          
          <p className="text-slate-500 max-w-md mx-auto">You have successfully clocked out and submitted your worksheet for today. Great job!</p>
        </div>
      )}
    </div>
  );
};

export default ClockInOut;
