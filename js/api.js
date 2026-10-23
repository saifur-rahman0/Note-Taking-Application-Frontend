// ─── API Configuration ────────────────────────────────────────────────────────
// When deployed to Vercel/Netlify, replace LIVE_BACKEND_URL with your live Render/Vercel URL
const LIVE_BACKEND_URL = 'https://note-taking-application-backend-seven.vercel.app/api';

const isLocalhost = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1' ||
                    window.location.protocol === 'file:';

const API_BASE = localStorage.getItem('API_BASE_URL') ||
                 (isLocalhost ? 'http://localhost:5000/api' : (LIVE_BACKEND_URL || '/api'));

// ─── Token Helpers ────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('token');
const getUser  = () => JSON.parse(localStorage.getItem('user') || 'null');

const setAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
let isRedirectingToLogin = false;

const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }

  if (!res.ok) {
    // If token is invalid / user not found in DB / unauthorized, clear stale credentials
    if (res.status === 401 && token) {
      clearAuth();
      const currentPath = window.location.pathname.toLowerCase();
      const isAuthPage = currentPath.endsWith('login.html') || currentPath.endsWith('register.html');
      if (!isAuthPage && !isRedirectingToLogin) {
        isRedirectingToLogin = true;
        showToast('Session expired or database reset. Redirecting to login...', 'error');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1200);
      }
    }
    throw new Error(data.message || data.errors?.[0]?.msg || 'Request failed');
  }
  return data;
};

// ─── Auth Guards ──────────────────────────────────────────────────────────────
const requireAuth = () => {
  if (!getToken()) { window.location.href = 'login.html'; return false; }
  return true;
};

const requireAdmin = () => {
  const user = getUser();
  if (!getToken() || user?.role !== 'admin') {
    window.location.href = 'dashboard.html'; return false;
  }
  return true;
};

const redirectIfLoggedIn = () => {
  if (!getToken()) return;
  const user = getUser();
  window.location.href = user?.role === 'admin' ? 'admin.html' : 'dashboard.html';
};

// ─── UI Helpers ───────────────────────────────────────────────────────────────
const showToast = (msg, type = 'success') => {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
};

const setLoading = (btn, loading) => {
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.original = btn.dataset.original || btn.textContent;
  btn.textContent = loading ? 'Loading...' : btn.dataset.original;
};
