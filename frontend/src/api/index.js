import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  // FormData yuborilganda Content-Type ni ochiramiz —
  // brauzer o'zi multipart/form-data; boundary=... qo'yadi
  if (cfg.data instanceof FormData) {
    delete cfg.headers['Content-Type'];
  }
  return cfg;
});

api.interceptors.response.use(
  res => res,
  async err => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      const refresh = localStorage.getItem('refresh');
      if (!refresh) { localStorage.clear(); window.location.href = '/login'; return; }
      try {
        const res = await axios.post('/api/token/refresh/', { refresh });
        localStorage.setItem('access', res.data.access);
        orig.headers.Authorization = `Bearer ${res.data.access}`;
        return api(orig);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

//  Auth 
export const authAPI = {
  login: d => api.post('/auth/login/', d),
  register: d => api.post('/auth/register/', d),
  me: () => api.get('/auth/users/me/'),
  getUser: id => api.get(`/auth/users/${id}/`),
  list: p => api.get('/auth/users/', { params: p }),
  supervisors: () => api.get('/auth/users/supervisors/'),
  kafedraStudents: () => api.get('/auth/users/kafedra_students/'),
  importStudents: async (formData) => {
    const token = localStorage.getItem('access');
    const res = await fetch('/api/auth/users/import_students/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw { response: { data } };
    return { data };
  },
};

//  Companies 
export const companyAPI = {
  my: () => api.get('/companies/companies/my/'),
  list: p => api.get('/companies/companies/', { params: p }),
  create: d => api.post('/companies/companies/', d),
  update: (id, d) => api.patch(`/companies/companies/${id}/`, d),
  approve: id => api.post(`/companies/companies/${id}/approve/`),
  reject: id => api.post(`/companies/companies/${id}/reject/`),
  adminCreate: d => api.post('/companies/companies/admin_create/', d),

  vacancies: p => api.get('/companies/vacancies/', { params: p }),
  createVacancy: d => api.post('/companies/vacancies/', d),
  updateVacancy: (id, d) => api.patch(`/companies/vacancies/${id}/`, d),

  mentors: p => api.get('/companies/mentors/', { params: p }),
  createMentor: d => api.post('/companies/mentors/', d),

  contractRequests: p => api.get('/companies/contract-requests/', { params: p }),
  sendContractRequest: d => api.post('/companies/contract-requests/', d),
  approveContract: (id, d) => api.post(`/companies/contract-requests/${id}/approve/`, d),
  rejectContract: (id, d) => api.post(`/companies/contract-requests/${id}/reject/`, d),
};

//  Internships 
export const appAPI = {
  list: p => api.get('/internships/applications/', { params: p }),
  create: d => api.post('/internships/applications/', d),
  hrApprove: (id, d) => api.post(`/internships/applications/${id}/hr_approve/`, d),
  hrReject: (id, d) => api.post(`/internships/applications/${id}/hr_reject/`, d),
  supApprove: (id, d) => api.post(`/internships/applications/${id}/sup_approve/`, d),
  supReject: (id, d) => api.post(`/internships/applications/${id}/sup_reject/`, d),
  requestLetter: id => api.get(`/internships/applications/${id}/request_letter/`, { responseType: 'blob' }),
  kafedraApprove: (id, d) => api.post(`/internships/applications/${id}/kafedra_approve/`, d),
  kafedraReject: (id, d) => api.post(`/internships/applications/${id}/kafedra_reject/`, d),
  kafedraBatchApprove: d => api.post('/internships/applications/kafedra_batch_approve/', d),
  kafedraAssignPlace: d => api.post('/internships/applications/kafedra_assign_place/', d),
};

export const internAPI = {
  list: p => api.get('/internships/internships/', { params: p }),
  get: id => api.get(`/internships/internships/${id}/`),
  assignMentor: (id, d) => api.post(`/internships/internships/${id}/assign_mentor/`, d),
  assignSupervisor: (id, d) => api.post(`/internships/internships/${id}/assign_supervisor/`, d),
  kafedraAssignSupervisor: (id, d) => api.post(`/internships/internships/${id}/kafedra_assign_supervisor/`, d),
  activate: id => api.post(`/internships/internships/${id}/activate/`),
  complete: id => api.post(`/internships/internships/${id}/complete/`),
  setMentorGrade: (id, d) => api.post(`/internships/internships/${id}/set_mentor_grade/`, d),
  setSupervisorGrade: (id, d) => api.post(`/internships/internships/${id}/set_supervisor_grade/`, d),
  setFinalGrade: (id, d) => api.post(`/internships/internships/${id}/set_final_grade/`, d),
};

export const taskAPI = {
  list: p => api.get('/internships/tasks/', { params: p }),
  create: d => api.post('/internships/tasks/', d),
  markDone: (id, d) => api.post(`/internships/tasks/${id}/mark_done/`, d),
  approve: (id, d) => api.post(`/internships/tasks/${id}/approve/`, d),
};

export const logAPI = {
  list: p => api.get('/internships/daily-logs/', { params: p }),
  create: d => api.post('/internships/daily-logs/', d),
  update: (id, d) => api.patch(`/internships/daily-logs/${id}/`, d),
  approve: (id, d) => api.post(`/internships/daily-logs/${id}/approve/`, d),
  supervisorApprove: (id, d) => api.post(`/internships/daily-logs/${id}/supervisor_approve/`, d),
  kafedraApprove: (id, d) => api.post(`/internships/daily-logs/${id}/kafedra_approve/`, d),
};

//  Attendance 
export const attAPI = {
  list: p => api.get('/attendance/', { params: p }),
  bulkMark: d => api.post('/attendance/bulk_mark/', d),
  summary: p => api.get('/attendance/summary/', { params: p }),
  checkin: d => api.post('/attendance/student_checkin/', d),
};

//  Documents 
export const docAPI = {
  list: p => api.get('/documents/', { params: p }),
  createYollanma: d => api.post('/documents/create_yollanma/', d),
  batchCreateYollanma: d => api.post('/documents/batch_create_yollanma/', d),
  batchSend: d => api.post('/documents/batch_send/', d),
  send: id => api.post(`/documents/${id}/send_to_company/`),
  companyAccept: id => api.post(`/documents/${id}/company_accept/`),
  companyReject: (id, d) => api.post(`/documents/${id}/company_reject/`, d),
  verify: uid => api.get(`/documents/verify/${uid}/`),
  downloadYollanma: id => api.get(`/documents/${id}/download_pdf/`, { responseType: 'blob' }),
  downloadBuyruq: id => api.get(`/documents/${id}/download_buyruq/`, { responseType: 'blob' }),
};

// Company Orders (Buyruqlar)
export const orderAPI = {
  list:          p => api.get('/documents/company-orders/', { params: p }),
  createAndSend: d => api.post('/documents/company-orders/create_and_send/', d),
  download:     id => api.get(`/documents/company-orders/${id}/download/`, { responseType: 'blob' }),
};

//  Logbooks
export const logbookAPI = {
  list:      p       => api.get('/internships/logbooks/', { params: p }),
  generate:  d       => api.post('/internships/logbooks/generate/', d),
  hrApprove: (id, d) => api.post(`/internships/logbooks/${id}/hr_approve/`, d),
  hrReject:  (id, d) => api.post(`/internships/logbooks/${id}/hr_reject/`, d),
  download:  id      => api.get(`/internships/logbooks/${id}/download/`, { responseType: 'blob' }),
};

//  Reports 
export const reportAPI = {
  list: p => api.get('/reports/', { params: p }),
  create: d => api.post('/reports/', d),
  update: (id, d) => api.patch(`/reports/${id}/`, d),
  submit: id => api.post(`/reports/${id}/submit/`),
  approve: (id, d) => api.post(`/reports/${id}/approve/`, d),
  reject: (id, d) => api.post(`/reports/${id}/reject/`, d),
  kafedraApprove: (id, d) => api.post(`/reports/${id}/kafedra_approve/`, d),
  kafedraReject: (id, d) => api.post(`/reports/${id}/kafedra_reject/`, d),
  analytics: () => api.get('/reports/analytics/'),
  downloadPdf: id => api.get(`/reports/${id}/download_pdf/`, { responseType: 'blob' }),
};

export default api;
