import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — attempt refresh
let isRefreshing = false;
let failedQueue = [];

function processQueue(error) {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve();
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(original)).catch((e) => Promise.reject(e));
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        processQueue(error);
        _logout();
        return Promise.reject(error);
      }

      try {
        const res = await axios.post('/api/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefresh } = res.data.data.tokens;
        localStorage.setItem('accessToken', accessToken);
        if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
        isRefreshing = false;
        processQueue(null);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError);
        _logout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

function _logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = '/login';
}

export default api;

// ─── Service helpers ────────────────────────────────────────────────────────

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
};

export const portfolioApi = {
  get: () => api.get('/portfolios'),
  placeOrder: (data) => api.post('/portfolios/orders', data),
  orders: (params) => api.get('/portfolios/orders', { params }),
  trades: (params) => api.get('/portfolios/trades', { params }),
  reset: () => api.post('/portfolios/reset'),
  closePosition: (positionId) => api.post(`/portfolios/positions/${positionId}/close`),
  refreshPnl: () => api.post('/portfolios/refresh-pnl'),
};

export const marketApi = {
  companies: () => api.get('/market/companies'),
  candles: (symbol, params) => api.get(`/market/candles/${symbol}`, { params }),
  news: (params) => api.get('/market/news', { params }),
};

export const journalApi = {
  list: (params) => api.get('/journal', { params }),
  get: (id) => api.get(`/journal/${id}`),
  create: (data) => api.post('/journal', data),
  update: (id, data) => api.patch(`/journal/${id}`, data),
  delete: (id) => api.delete(`/journal/${id}`),
  stats: () => api.get('/journal/stats'),
  export: () => api.get('/journal/export', { responseType: 'blob' }),
  strategies: () => api.get('/journal/strategies'),
  createStrategy: (data) => api.post('/journal/strategies', data),
};

export const riskApi = {
  positionSize: (data) => api.post('/risk/position-size', data),
  riskReward: (data) => api.post('/risk/risk-reward', data),
  checklist: (data) => api.post('/risk/checklist', data),
};

export const rulesApi = {
  evaluate: (entryId) => api.post(`/rules/evaluate/${entryId}`),
  findings: (params) => api.get('/rules/findings', { params }),
  coverage: () => api.get('/rules/coverage'),
  dispute: (findingId, data) => api.post(`/rules/findings/${findingId}/dispute`, data),
  disputes: () => api.get('/rules/disputes'),
  resolveDispute: (disputeId, data) => api.patch(`/rules/disputes/${disputeId}/resolve`, data),
};

export const testsApi = {
  list: () => api.get('/tests'),
  library: (params) => api.get('/tests/library', { params }),
  get: (id) => api.get(`/tests/${id}`),
  create: (data) => api.post('/tests', data),
  publish: (id) => api.patch(`/tests/${id}/publish`),
  assign: (id, data) => api.post(`/tests/${id}/assign`, data),
  startAttempt: (id) => api.post(`/tests/${id}/start`),
  submitAttempt: (attemptId, data) => api.post(`/tests/attempts/${attemptId}/submit`, data),
  getResult: (attemptId) => api.get(`/tests/attempts/${attemptId}/result`),
};

export const connectionsApi = {
  createInvitation: (data) => api.post('/connections/invitations', data),
  getInvitations: () => api.get('/connections/invitations'),
  accept: (code) => api.post('/connections/accept', { code }),
  list: () => api.get('/connections'),
  revoke: (id) => api.patch(`/connections/${id}/revoke`),
  studentJournal: (studentId, params) => api.get(`/connections/students/${studentId}/journal`, { params }),
  studentFindings: (studentId) => api.get(`/connections/students/${studentId}/findings`),
};

export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard'),
  pnlChart: (params) => api.get('/analytics/pnl-chart', { params }),
  strategyPerformance: () => api.get('/analytics/strategy-performance'),
};

export const aicoachApi = {
  generate: () => api.post('/ai-coach/generate'),
  latest: () => api.get('/ai-coach/latest'),
};

export const notificationsApi = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
};

export const feedbackApi = {
  give: (data) => api.post('/feedback', data),
  mine: () => api.get('/feedback/mine'),
};

export const learningApi = {
  resources: (params) => api.get('/learning/resources', { params }),
  resource: (id) => api.get(`/learning/resources/${id}`),
  exercises: () => api.get('/learning/exercises'),
  completeExercise: (id) => api.patch(`/learning/exercises/${id}/complete`),
};

export const scenariosApi = {
  list: (params) => api.get('/scenarios', { params }),
  mine: () => api.get('/scenarios/mine'),
  create: (data) => api.post('/scenarios', data),
  publish: (id) => api.patch(`/scenarios/${id}/publish`),
  get: (slugOrId) => api.get(`/scenarios/${slugOrId}`),
  startAttempt: (id) => api.post(`/scenarios/${id}/start`),
  submitAttempt: (attemptId, data) => api.post(`/scenarios/attempts/${attemptId}/submit`, data),
  getAttemptReview: (attemptId) => api.get(`/scenarios/attempts/${attemptId}/review`),
  myAttempts: (params) => api.get('/scenarios/attempts', { params }),
};

export const cohortsApi = {
  list: () => api.get('/cohorts'),
  create: (data) => api.post('/cohorts', data),
  delete: (id) => api.delete(`/cohorts/${id}`),
  members: (id) => api.get(`/cohorts/${id}/members`),
  students: () => api.get('/cohorts/students'),
};
