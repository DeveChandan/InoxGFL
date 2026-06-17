import axios from 'axios';

const api = axios.create({
  // In BTP, the Approuter handles routing. We use a relative path so the 
  // Approuter catches the request and proxies it to the backend module.
  baseURL: '/api',
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('X-InoxGFL-Token', token);
      } else {
        (config.headers as any)['X-InoxGFL-Token'] = token;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isTimeoutModalOpen = false;

const handleSessionTimeout = () => {
  if (isTimeoutModalOpen) return;
  isTimeoutModalOpen = true;

  const modalDiv = document.createElement('div');
  modalDiv.id = 'inoxgfl-session-timeout-modal';
  
  modalDiv.style.position = 'fixed';
  modalDiv.style.inset = '0';
  modalDiv.style.zIndex = '99999';
  modalDiv.style.display = 'flex';
  modalDiv.style.alignItems = 'center';
  modalDiv.style.justifyContent = 'center';
  modalDiv.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
  modalDiv.style.backdropFilter = 'blur(8px)';
  modalDiv.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  modalDiv.style.animation = 'fadeIn 0.3s ease-out';

  modalDiv.innerHTML = `
    <div style="
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(226, 232, 240, 0.8);
      border-radius: 24px;
      padding: 40px;
      max-width: 480px;
      width: 90%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      text-align: center;
      animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    ">
      <div style="
        width: 72px;
        height: 72px;
        background: #FEF3C7;
        color: #D97706;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 24px;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" style="width: 36px; height: 36px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 style="
        font-size: 24px;
        font-weight: 800;
        color: #0F172A;
        margin: 0 0 12px 0;
      ">Session Expired</h3>
      <p style="
        font-size: 15px;
        color: #64748B;
        line-height: 1.6;
        margin: 0 0 32px 0;
      ">Your session has timed out due to inactivity. Please refresh the page to log back in and continue.</p>
      <button id="inoxgfl-refresh-btn" style="
        background: #0284C7;
        color: white;
        border: none;
        border-radius: 12px;
        padding: 14px 28px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        width: 100%;
        box-shadow: 0 10px 15px -3px rgba(2, 132, 199, 0.3);
        transition: all 0.2s;
      ">
        Refresh & Log In
      </button>
    </div>
    <style>
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleUp {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      #inoxgfl-refresh-btn:hover {
        background: #0369A1 !important;
        transform: translateY(-2px);
        box-shadow: 0 12px 20px -3px rgba(2, 132, 199, 0.4) !important;
      }
      #inoxgfl-refresh-btn:active {
        transform: translateY(0);
      }
    </style>
  `;

  document.body.appendChild(modalDiv);

  const btn = document.getElementById('inoxgfl-refresh-btn');
  if (btn) {
    btn.onclick = () => {
      window.location.reload();
    };
  }
};

api.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (typeof data === 'string' && (data.includes('<html>') || data.includes('locationAfterLogin') || data.includes('oauth/authorize') || data.includes('fragmentAfterLogin'))) {
      handleSessionTimeout();
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }
    return response;
  },
  (error) => {
    // Check if the error is a relative request failing with status code 0 / Network Error due to a CORS redirect block
    if (error.message && (error.message.includes('Network Error') || error.message.includes('status code 0'))) {
      // Show warning popup since it is likely a redirect CORS block from session expiration
      handleSessionTimeout();
    }
    return Promise.reject(error);
  }
);

export default api;
