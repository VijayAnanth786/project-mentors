import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000 // 60s timeout for cold start resiliency
});

// Automatic JWT bearer injection
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pm_auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for session expiration & network diagnostics
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthEndpoint = requestUrl.includes('/auth/login') ||
                           requestUrl.includes('/auth/register') ||
                           requestUrl.includes('/auth/me');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('pm_auth_token');
      localStorage.removeItem('pm_user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        console.warn(`[API Timeout] Backend took longer than 60s to respond. It may still be waking up.`);
      } else {
        console.warn(`[Network Error] Could not connect to API at ${API_BASE_URL}. Check deployment status and URL configuration.`);
      }
    }
    return Promise.reject(error);
  }
);

// Typed API Functions
export const api = {
  // Auth
  auth: {
    login: async (credentials: { email: string; password: string }) => {
      const res = await apiClient.post('/auth/login', credentials);
      return res.data;
    },
    register: async (payload: { name: string; email: string; password: string; department?: string; year?: string; college?: string }) => {
      const res = await apiClient.post('/auth/register', payload);
      return res.data;
    },
    changePassword: async (payload: { currentPassword: string; newPassword: string }) => {
      const res = await apiClient.post('/auth/change-password', payload);
      return res.data;
    },
    getMe: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data;
    },
    logout: async () => {
      try {
        await apiClient.post('/auth/logout');
      } finally {
        localStorage.removeItem('pm_auth_token');
        localStorage.removeItem('pm_user');
      }
    }
  },

  // Mentor
  mentor: {
    getDashboard: async () => {
      const res = await apiClient.get('/mentor/dashboard');
      return res.data.data;
    },
    getTeams: async () => {
      const res = await apiClient.get('/mentor/teams');
      return res.data.data;
    },
    getTeamDetails: async (teamId: string) => {
      const res = await apiClient.get(`/mentor/teams/${teamId}`);
      return res.data.data;
    },
    getProjects: async (params?: { search?: string; status?: string }) => {
      const res = await apiClient.get('/mentor/projects', { params });
      return res.data.data;
    },
    getReviews: async (params?: { status?: string }) => {
      const res = await apiClient.get('/mentor/reviews', { params });
      return res.data.data;
    },
    submitReview: async (id: string, payload: { action: 'APPROVE' | 'CHANGES_REQUESTED'; feedback: string }) => {
      const res = await apiClient.post(`/mentor/reviews/${id}`, payload);
      return res.data;
    },
    getMeetings: async () => {
      const res = await apiClient.get('/mentor/meetings');
      return res.data.data;
    },
    scheduleMeeting: async (payload: {
      teamId: string;
      title: string;
      date: string;
      time: string;
      linkOrLocation: string;
      notes?: string;
    }) => {
      const res = await apiClient.post('/mentor/meetings', payload);
      return res.data;
    },
    getNotifications: async () => {
      const res = await apiClient.get('/mentor/notifications');
      return res.data.data;
    },
    markNotificationRead: async (id: string) => {
      const res = await apiClient.put(`/mentor/notifications/${id}/read`);
      return res.data;
    },
    updateProfile: async (payload: { department: string; title?: string; bio?: string; phone?: string; name?: string }) => {
      const res = await apiClient.put('/mentor/profile', payload);
      return res.data;
    }
  },

  // Admin
  admin: {
    getDashboard: async () => {
      const res = await apiClient.get('/admin/dashboard');
      return res.data.data;
    },
    getStudents: async (params?: { search?: string; status?: string }) => {
      const res = await apiClient.get('/admin/students', { params });
      return res.data.data;
    },
    updateStudentStatus: async (id: string, status: 'active' | 'inactive') => {
      const res = await apiClient.put(`/admin/students/${id}/status`, { status });
      return res.data;
    },
    getMentors: async () => {
      const res = await apiClient.get('/admin/mentors');
      return res.data.data;
    },
    addMentor: async (payload: { name: string; email: string; department: string; title?: string }) => {
      const res = await apiClient.post('/admin/mentors', payload);
      return res.data;
    },
    updateMentor: async (id: string, payload: { name: string; department: string; title?: string; phone?: string; bio?: string }) => {
      const res = await apiClient.put(`/admin/mentors/${id}`, payload);
      return res.data;
    },
    updateMentorStatus: async (id: string, status: 'active' | 'inactive') => {
      const res = await apiClient.put(`/admin/mentors/${id}/status`, { status });
      return res.data;
    },
    getTeams: async (params?: { search?: string; mentorFilter?: string; status?: string; page?: number; limit?: number }) => {
      const res = await apiClient.get('/admin/teams', { params });
      return res.data;
    },
    assignMentor: async (teamId: string, mentorId: string | null) => {
      const res = await apiClient.put(`/admin/teams/${teamId}/assign-mentor`, { mentorId });
      return res.data;
    },
    getProjects: async (params?: { search?: string; status?: string }) => {
      const res = await apiClient.get('/admin/projects', { params });
      return res.data.data;
    },
    getAnnouncements: async () => {
      const res = await apiClient.get('/admin/announcements');
      return res.data.data;
    },
    createAnnouncement: async (payload: { title: string; message: string; audience: 'all' | 'students' | 'mentors' }) => {
      const res = await apiClient.post('/admin/announcements', payload);
      return res.data;
    },
    getReports: async () => {
      const res = await apiClient.get('/admin/reports');
      return res.data.data;
    },
    getSettings: async () => {
      const res = await apiClient.get('/admin/settings');
      return res.data.data;
    },
    updateSettings: async (settings: Record<string, any>) => {
      const res = await apiClient.put('/admin/settings', settings);
      return res.data;
    }
  },

  // Student
  student: {
    getDashboard: async () => {
      const res = await apiClient.get('/student/dashboard');
      return res.data.data;
    },
    submitProgress: async (payload: any) => {
      const res = await apiClient.post('/student/submissions', payload);
      return res.data;
    },
    getTeams: async () => {
      const res = await apiClient.get('/student/teams');
      return res.data.data;
    },
    createTeam: async (payload: {
      name: string;
      projectTitle: string;
      description?: string;
      techStack?: string[];
      yearCohort?: string;
      department?: string;
      githubUrl?: string;
    }) => {
      const res = await apiClient.post('/student/teams', payload);
      return res.data;
    },
    joinTeam: async (teamId: string) => {
      const res = await apiClient.post(`/student/teams/${teamId}/join`);
      return res.data;
    }
  }
};

