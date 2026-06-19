import api from './client'

// Auth
export const authAPI = {
  login: (data) => api.post('/api/v1/auth/login', data),
  me: () => api.get('/api/v1/auth/me'),
}

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/api/v1/dashboard/stats'),
  getRecentActivity: () => api.get('/api/v1/dashboard/recent-activity'),
  getAuditLogs: (params) => api.get('/api/v1/dashboard/audit-logs', { params }),
}

// Templates
export const templatesAPI = {
  list: () => api.get('/api/v1/templates/'),
  get: (id) => api.get(`/api/v1/templates/${id}`),
  create: (formData) => api.post('/api/v1/templates/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.put(`/api/v1/templates/${id}`, data),
  delete: (id) => api.delete(`/api/v1/templates/${id}`),
  getFileUrl: (id) => `${api.defaults.baseURL}/api/v1/templates/${id}/file`,
}

// Events
export const eventsAPI = {
  list: (params) => api.get('/api/v1/events/', { params }),
  get: (id) => api.get(`/api/v1/events/${id}`),
  create: (data) => api.post('/api/v1/events/', data),
  update: (id, data) => api.put(`/api/v1/events/${id}`, data),
  delete: (id) => api.delete(`/api/v1/events/${id}`),
  getStatus: (id) => api.get(`/api/v1/events/${id}/status`),
  downloadZip: (id) => api.get(`/api/v1/events/${id}/download-zip`, { responseType: 'blob' }),
  sendEmails: (id) => api.post(`/api/v1/events/${id}/send-emails`),
  getEmailStatus: (id) => api.get(`/api/v1/events/${id}/email-status`),
}

// Excel + Generation
export const excelAPI = {
  upload: (eventId, formData) => api.post(`/api/v1/events/${eventId}/upload-excel`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  generate: (eventId) => api.post(`/api/v1/events/${eventId}/generate`),
  preview: (eventId) => api.get(`/api/v1/events/${eventId}/preview`, { responseType: 'blob' }),
}

// Certificates
export const certificatesAPI = {
  list: (params) => api.get('/api/v1/certificates/', { params }),
  get: (id) => api.get(`/api/v1/certificates/${id}`),
  download: (id) => api.get(`/api/v1/certificates/${id}/download`, { responseType: 'blob' }),
  regenerate: (id) => api.post(`/api/v1/certificates/${id}/regenerate`),
  delete: (id) => api.delete(`/api/v1/certificates/${id}`),
  sendEmail: (id) => api.post(`/api/v1/certificates/${id}/send-email`),
  verify: (certId) => api.get(`/api/v1/verify/${certId}`),
}

// Email SMTP API
export const emailAPI = {
  sendCustom: (formData) => api.post('/api/v1/email/send-custom', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getConfig: () => api.get('/api/v1/email/config'),
}

