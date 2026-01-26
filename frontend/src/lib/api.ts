import axios from 'axios';

const rawApiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const normalizedBase = rawApiBase.replace(/\/+$/, '');
const apiBaseUrl = normalizedBase.endsWith('/api/v1')
  ? normalizedBase
  : `${normalizedBase}/api/v1`;

// Call backend directly to avoid proxy/redirect issues
const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors - DON'T auto-redirect, let components handle it
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth on 401
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = async (email: string, password: string) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await api.post('/auth/token', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
};

export const register = async (email: string, password: string, fullName: string) => {
  const response = await api.post('/auth/register', {
    email,
    password,
    full_name: fullName,
  });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/users/me');
  return response.data;
};

// Sessions
export const uploadSession = async (
  audio: File,
  title: string,
  sessionType: string = 'coding',
  gitBranch?: string
) => {
  const formData = new FormData();
  formData.append('audio', audio);
  formData.append('title', title);
  formData.append('session_type', sessionType);
  if (gitBranch) formData.append('git_branch', gitBranch);

  const response = await api.post('/sessions/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const listSessions = async (skip = 0, limit = 20) => {
  const response = await api.get('/sessions/', { params: { skip, limit } });
  return response.data;
};

export const getSession = async (sessionId: number) => {
  const response = await api.get(`/sessions/${sessionId}`);
  return response.data;
};

// Decisions
export const listDecisions = async (params?: {
  skip?: number;
  limit?: number;
  domain?: string;
  status?: string;
  tag?: string;
}) => {
  const response = await api.get('/decisions/', { params });
  return response.data;
};

export const getDecision = async (decisionId: number) => {
  const response = await api.get(`/decisions/${decisionId}`);
  return response.data;
};

export const createDecision = async (decision: {
  title: string;
  decision_text: string;
  reasoning: string;
  domain: string;
  confidence?: number;
  visibility?: string;
}) => {
  const response = await api.post('/decisions/', decision);
  return response.data;
};

export const updateDecision = async (
  decisionId: number,
  updates: Partial<{
    title: string;
    decision_text: string;
    reasoning: string;
    status: string;
    visibility: string;
  }>
) => {
  const response = await api.patch(`/decisions/${decisionId}`, updates);
  return response.data;
};

export const getDomains = async () => {
  const response = await api.get('/decisions/domains');
  return response.data;
};

// Personal Bot
export const queryMyBot = async (question: string) => {
  const response = await api.post('/bot/query', { question });
  return response.data;
};

export const queryUserBot = async (userId: number, question: string) => {
  const response = await api.post(`/bot/users/${userId}/query`, { question });
  return response.data;
};

export const getBotStats = async () => {
  const response = await api.get('/bot/stats');
  return response.data;
};

export const getRecentReasoning = async (days = 7) => {
  const response = await api.get('/bot/recent', { params: { days } });
  return response.data;
};

export const getDomainSummaries = async () => {
  const response = await api.get('/bot/domains');
  return response.data;
};

// Team
export const listTeams = async () => {
  const response = await api.get('/team/');
  return response.data;
};

export const createTeam = async (name: string, slug: string, description?: string) => {
  const response = await api.post('/team/', { name, slug, description });
  return response.data;
};

export const getTeamMembers = async (teamId: number) => {
  const response = await api.get(`/team/${teamId}/members`);
  return response.data;
};

export const addTeamMember = async (teamId: number, userId: number, role = 'member') => {
  const response = await api.post(`/team/${teamId}/members`, null, {
    params: { user_id: userId, role },
  });
  return response.data;
};

export const queryTeam = async (teamId: number, question: string) => {
  const response = await api.post(`/team/${teamId}/query`, { question });
  return response.data;
};

export const detectConflicts = async (teamId: number, days = 7) => {
  const response = await api.get(`/team/${teamId}/conflicts`, { params: { days } });
  return response.data;
};

export const checkAlignment = async (
  teamId: number,
  topic: string,
  userIds: number[]
) => {
  const response = await api.post(`/team/${teamId}/alignment`, {
    topic,
    user_ids: userIds,
  });
  return response.data;
};

export const getTeamActivity = async (teamId: number, days = 7) => {
  const response = await api.get(`/team/${teamId}/activity`, { params: { days } });
  return response.data;
};

export default api;
