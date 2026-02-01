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

// Users
export interface UserSearchResult {
  id: number;
  email: string;
  full_name: string;
}

export const searchUsers = async (query: string, limit = 10): Promise<UserSearchResult[]> => {
  if (!query || query.length < 2) return [];
  const response = await api.get('/users/search/', { params: { q: query, limit } });
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

export interface TeamDecision {
  id: number;
  title: string;
  decision_text: string;
  reasoning: string;
  confidence: number;
  domain: string;
  tags: string[];
  status: string;
  owner_id: number;
  owner_name: string;
  created_at: string;
}

export const getTeamDecisions = async (
  teamId: number,
  params?: { skip?: number; limit?: number; domain?: string }
): Promise<{ decisions: TeamDecision[]; domains: string[]; total: number }> => {
  const response = await api.get(`/team/${teamId}/decisions`, { params });
  return response.data;
};

// Video & Document Upload
export const uploadVideoSession = async (
  video: File,
  title: string,
  sessionType: string = 'coding',
  gitBranch?: string
) => {
  const formData = new FormData();
  formData.append('video', video);
  formData.append('title', title);
  formData.append('session_type', sessionType);
  if (gitBranch) formData.append('git_branch', gitBranch);

  const response = await api.post('/sessions/upload-video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000, // 5 min for large videos
  });
  return response.data;
};

export const uploadDocumentSession = async (
  document: File,
  title: string,
  sessionType: string = 'design',
  gitBranch?: string
) => {
  const formData = new FormData();
  formData.append('document', document);
  formData.append('title', title);
  formData.append('session_type', sessionType);
  if (gitBranch) formData.append('git_branch', gitBranch);

  const response = await api.post('/sessions/upload-document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Google OAuth & Drive
export const getGoogleAuthUrl = async () => {
  const response = await api.get('/google/connect');
  return response.data;
};

export const getGoogleAuthStatus = async () => {
  const response = await api.get('/google/status');
  return response.data;
};

export const disconnectGoogle = async () => {
  const response = await api.delete('/google/disconnect');
  return response.data;
};

export const listGoogleDriveFiles = async (query?: string) => {
  const response = await api.get('/google/drive/files', { params: query ? { query } : {} });
  return response.data;
};

export const importGoogleDoc = async (
  docId: string,
  title: string,
  sessionType: string = 'design',
  gitBranch?: string
) => {
  const response = await api.post('/google/docs/import', {
    doc_id: docId,
    title,
    session_type: sessionType,
    git_branch: gitBranch,
  });
  return response.data;
};

// Bot Meetings
export interface MeetingParticipant {
  user_id: number;
  full_name: string;
  joined_at: string;
  is_bot_active: boolean;
}

export interface MeetingMessage {
  id: number;
  role: 'bot' | 'facilitator' | 'system';
  speaker_name: string;
  speaker_user_id: number | null;
  content: string;
  cited_decisions: number[] | null;
  sequence: number;
  created_at: string;
}

export interface Meeting {
  id: number;
  title: string;
  topic: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  initiator_name: string;
  participant_count: number;
  message_count: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface MeetingDetail extends Meeting {
  description: string | null;
  team_id: number;
  initiator_id: number;
  summary: string | null;
  consensus_reached: boolean | null;
  action_items: Array<{ action: string; owner?: string }> | null;
  participants: MeetingParticipant[];
  messages: MeetingMessage[];
}

export const createMeeting = async (data: {
  title: string;
  topic: string;
  description?: string;
  team_id: number;
  participant_ids: number[];
}) => {
  const response = await api.post('/meetings/', data);
  return response.data as Meeting;
};

export const listMeetings = async (teamId?: number) => {
  const response = await api.get('/meetings/', {
    params: teamId ? { team_id: teamId } : {},
  });
  return response.data as Meeting[];
};

export const getMeeting = async (meetingId: number) => {
  const response = await api.get(`/meetings/${meetingId}`);
  return response.data as MeetingDetail;
};

export const startMeeting = async (meetingId: number) => {
  const response = await api.post(`/meetings/${meetingId}/start`);
  return response.data as MeetingDetail;
};

export const runMeetingDiscussion = async (meetingId: number, maxTurns = 10) => {
  const response = await api.post(`/meetings/${meetingId}/run`, null, {
    params: { max_turns: maxTurns },
    timeout: 180000, // 3 min for long discussions
  });
  return response.data as MeetingDetail;
};

export const endMeeting = async (meetingId: number) => {
  const response = await api.post(`/meetings/${meetingId}/end`);
  return response.data as MeetingDetail;
};

export const getMeetingMessages = async (meetingId: number) => {
  const response = await api.get(`/meetings/${meetingId}/messages`);
  return response.data as MeetingMessage[];
};

export default api;
