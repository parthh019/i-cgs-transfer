import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
})

// ============================================================================
//  Client-Side LocalStorage Mock DB
// ============================================================================

const getDB = (key, defaultVal) => {
  const data = localStorage.getItem(`mock_db_${key}`)
  if (!data) {
    localStorage.setItem(`mock_db_${key}`, JSON.stringify(defaultVal))
    return defaultVal
  }
  return JSON.parse(data)
}

const saveDB = (key, data) => {
  localStorage.setItem(`mock_db_${key}`, JSON.stringify(data))
}

// Initialize seed data
const SEED_TEMPLATES = [
  {
    id: 'tpl-1',
    template_name: 'Gold Achievement Certificate',
    template_file: 'templates/tpl-1.png',
    file_type: 'png',
    placeholder_config: {
      candidate_name: { x: 400, y: 280, font_size: 32, font_color: '#d97706', alignment: 'center', font_name: 'Helvetica-Bold', enabled: true },
      certificate_id: { x: 120, y: 520, font_size: 14, font_color: '#4b5563', alignment: 'left', font_name: 'Helvetica', enabled: true },
      date: { x: 680, y: 520, font_size: 14, font_color: '#4b5563', alignment: 'right', font_name: 'Helvetica', enabled: true },
      course_name: { x: 400, y: 360, font_size: 20, font_color: '#1f2937', alignment: 'center', font_name: 'Helvetica-Bold', enabled: true },
      organization_name: { x: 400, y: 150, font_size: 18, font_color: '#059669', alignment: 'center', font_name: 'Helvetica-Bold', enabled: true },
      organization_name_value: 'CertifyPro Training Academy'
    },
    created_at: '2026-06-17T08:00:00.000Z'
  }
]

const SEED_EVENTS = [
  {
    id: 'evt-1',
    name: 'Advanced React Architecture Workshop',
    event_date: '2026-06-15',
    template_id: 'tpl-1',
    status: 'completed',
    total_certificates: 3,
    generated_certificates: 3,
    created_at: '2026-06-15T09:00:00.000Z'
  },
  {
    id: 'evt-2',
    name: 'FastAPI Production Scaffolding',
    event_date: '2026-06-25',
    template_id: 'tpl-1',
    status: 'draft',
    total_certificates: 0,
    generated_certificates: 0,
    created_at: '2026-06-17T06:00:00.000Z'
  }
]

const SEED_CERTIFICATES = [
  {
    id: 'cert-1',
    certificate_id: 'CERT-20260615-REACT1',
    event_id: 'evt-1',
    attendee_name: 'Alex Johnson',
    attendee_email: 'alex.j@example.com',
    course_name: 'Advanced React Architecture Workshop',
    issue_date: '2026-06-15',
    pdf_path: 'certificates/evt-1/cert-1.pdf',
    qr_code_path: 'qrcodes/cert-1.png',
    status: 'emailed',
    email_sent: true,
    email_sent_at: '2026-06-15T14:30:00.000Z',
    created_at: '2026-06-15T14:00:00.000Z'
  },
  {
    id: 'cert-2',
    certificate_id: 'CERT-20260615-REACT2',
    event_id: 'evt-1',
    attendee_name: 'Emma Watson',
    attendee_email: 'emma.w@example.com',
    course_name: 'Advanced React Architecture Workshop',
    issue_date: '2026-06-15',
    pdf_path: 'certificates/evt-1/cert-2.pdf',
    qr_code_path: 'qrcodes/cert-2.png',
    status: 'generated',
    email_sent: false,
    created_at: '2026-06-15T14:00:00.000Z'
  },
  {
    id: 'cert-3',
    certificate_id: 'CERT-20260615-REACT3',
    event_id: 'evt-1',
    attendee_name: 'Robert Downey',
    attendee_email: 'robert.d@example.com',
    course_name: 'Advanced React Architecture Workshop',
    issue_date: '2026-06-15',
    pdf_path: 'certificates/evt-1/cert-3.pdf',
    qr_code_path: 'qrcodes/cert-3.png',
    status: 'failed',
    email_sent: false,
    email_error: 'SMTP Connection timeout (simulated)',
    created_at: '2026-06-15T14:00:00.000Z'
  }
]

const SEED_AUDITS = [
  { id: 'aud-1', admin_name: 'System Admin', action: 'login', resource: 'admin', created_at: '2026-06-17T12:00:00.000Z' },
  { id: 'aud-2', admin_name: 'System Admin', action: 'create', resource: 'template', resource_id: 'tpl-1', details: 'Created Gold Achievement Certificate template', created_at: '2026-06-17T08:00:00.000Z' },
  { id: 'aud-3', admin_name: 'System Admin', action: 'create', resource: 'event', resource_id: 'evt-1', details: 'Created Advanced React Architecture Workshop event', created_at: '2026-06-15T09:00:00.000Z' }
]

// Mock Router Engine
const handleMockRequest = (method, url, data, params) => {
  const baseURL = api.defaults.baseURL
  const normUrl = (baseURL ? url.replace(baseURL, '') : url).split('?')[0]
  
  // DB references
  const templates = getDB('templates', SEED_TEMPLATES)
  const events = getDB('events', SEED_EVENTS)
  const certificates = getDB('certificates', SEED_CERTIFICATES)
  const audits = getDB('audits', SEED_AUDITS)

  const logAudit = (action, resource, resourceId, details) => {
    const newAudit = {
      id: `aud-${Date.now()}`,
      admin_name: 'System Admin',
      action,
      resource,
      resource_id: resourceId,
      details,
      created_at: new Date().toISOString()
    }
    audits.unshift(newAudit)
    saveDB('audits', audits)
  }

  // --- Auth Endpoints ---
  if (normUrl.endsWith('/api/v1/auth/login')) {
    return {
      access_token: 'mock_jwt_token',
      token_type: 'bearer',
      admin: { id: '1', name: 'System Admin', email: 'admin@company.com', is_active: true }
    }
  }
  if (normUrl.endsWith('/api/v1/auth/me')) {
    return { id: '1', name: 'System Admin', email: 'admin@company.com', is_active: true }
  }

  // --- Dashboard Endpoints ---
  if (normUrl.endsWith('/api/v1/dashboard/stats')) {
    return {
      total_certificates: certificates.length,
      total_events: events.length,
      total_templates: templates.length,
      total_emails_sent: certificates.filter(c => c.email_sent).length,
      certificates_today: certificates.filter(c => c.created_at?.startsWith(new Date().toISOString().split('T')[0])).length,
      pending_certificates: certificates.filter(c => c.status === 'pending').length,
      failed_certificates: certificates.filter(c => c.status === 'failed').length,
      events_by_status: {
        draft: events.filter(e => e.status === 'draft').length,
        processing: events.filter(e => e.status === 'processing').length,
        completed: events.filter(e => e.status === 'completed').length,
        failed: events.filter(e => e.status === 'failed').length
      }
    }
  }
  if (normUrl.endsWith('/api/v1/dashboard/recent-activity')) {
    return { items: audits.slice(0, 20), total: audits.length }
  }
  if (normUrl.endsWith('/api/v1/dashboard/audit-logs')) {
    const page = parseInt(params?.page || 1)
    const pageSize = parseInt(params?.page_size || 20)
    let filtered = [...audits]
    if (params?.action) filtered = filtered.filter(a => a.action === params.action)
    if (params?.resource) filtered = filtered.filter(a => a.resource === params.resource)
    
    const start = (page - 1) * pageSize
    return {
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(filtered.length / pageSize)
    }
  }

  // --- Templates Endpoints ---
  if (normUrl === '/api/v1/templates/' && method === 'get') {
    return templates
  }
  if (normUrl === '/api/v1/templates/' && method === 'post') {
    const templateName = data.get('name') || 'Unnamed Template'
    const file = data.get('file')
    const placeholderConfig = data.get('placeholder_config') ? JSON.parse(data.get('placeholder_config')) : {}
    
    const newTpl = {
      id: `tpl-${Date.now()}`,
      template_name: templateName,
      template_file: `templates/${file?.name || 'custom.png'}`,
      file_type: file?.name?.split('.').pop() || 'png',
      placeholder_config: placeholderConfig,
      created_at: new Date().toISOString()
    }
    templates.push(newTpl)
    saveDB('templates', templates)
    logAudit('create', 'template', newTpl.id, `Created template "${templateName}"`)
    return newTpl
  }
  if (normUrl.match(/\/api\/v1\/templates\/[^\/]+$/)) {
    const id = normUrl.split('/').pop()
    const tpl = templates.find(t => t.id === id)
    if (method === 'get') {
      return tpl
    }
    if (method === 'put') {
      const index = templates.findIndex(t => t.id === id)
      if (index !== -1) {
        templates[index] = { ...templates[index], ...data }
        saveDB('templates', templates)
        logAudit('update', 'template', id, `Updated configuration for template "${templates[index].template_name}"`)
        return templates[index]
      }
    }
    if (method === 'delete') {
      const filtered = templates.filter(t => t.id !== id)
      saveDB('templates', filtered)
      logAudit('delete', 'template', id, `Deleted template`)
      return { status: 'deleted' }
    }
  }

  // --- Events Endpoints ---
  if (normUrl === '/api/v1/events/' && method === 'get') {
    return events
  }
  if (normUrl === '/api/v1/events/' && method === 'post') {
    const newEvt = {
      id: `evt-${Date.now()}`,
      name: data.name,
      event_date: data.event_date,
      template_id: data.template_id,
      status: 'draft',
      total_certificates: 0,
      generated_certificates: 0,
      created_at: new Date().toISOString()
    }
    events.push(newEvt)
    saveDB('events', events)
    logAudit('create', 'event', newEvt.id, `Created event "${data.name}"`)
    return newEvt
  }
  if (normUrl.match(/\/api\/v1\/events\/[^\/]+$/)) {
    const id = normUrl.split('/').pop()
    const evt = events.find(e => e.id === id)
    if (method === 'get') {
      return evt
    }
    if (method === 'put') {
      const index = events.findIndex(e => e.id === id)
      if (index !== -1) {
        events[index] = { ...events[index], ...data }
        saveDB('events', events)
        logAudit('update', 'event', id, `Updated event "${events[index].name}"`)
        return events[index]
      }
    }
    if (method === 'delete') {
      const filtered = events.filter(e => e.id !== id)
      saveDB('events', filtered)
      // Delete associated certificates
      const certFiltered = certificates.filter(c => c.event_id !== id)
      saveDB('certificates', certFiltered)
      logAudit('delete', 'event', id, `Deleted event`)
      return { status: 'deleted' }
    }
  }

  // --- Excel Upload & Mock Generation ---
  if (normUrl.match(/\/api\/v1\/events\/[^\/]+\/upload-excel/)) {
    const eventId = normUrl.split('/')[4]
    const count = 4 + Math.floor(Math.random() * 4) // Generate 4-8 records
    const previewRows = [
      { attendee_name: 'John Doe', attendee_email: 'john.doe@example.com', course_name: 'Advanced React', issue_date: '2026-06-17' },
      { attendee_name: 'Sarah Connor', attendee_email: 'sarah.c@sky.net', course_name: 'Advanced React', issue_date: '2026-06-17' },
      { attendee_name: 'Bruce Wayne', attendee_email: 'bruce@waynecorp.com', course_name: 'Advanced React', issue_date: '2026-06-17' }
    ]

    // Save mock certificates
    for (let i = 1; i <= count; i++) {
      const name = previewRows[i - 1]?.attendee_name || `Attendee #${i}`
      const email = previewRows[i - 1]?.attendee_email || `attendee${i}@example.com`
      certificates.push({
        id: `cert-new-${Date.now()}-${i}`,
        certificate_id: `CERT-20260617-MOCK${i}${Date.now().toString().slice(-3)}`,
        event_id: eventId,
        attendee_name: name,
        attendee_email: email,
        course_name: 'Advanced React Architecture Workshop',
        issue_date: '2026-06-17',
        pdf_path: null,
        qr_code_path: null,
        status: 'pending',
        email_sent: false,
        created_at: new Date().toISOString()
      })
    }
    saveDB('certificates', certificates)

    // Update event totals
    const eIndex = events.findIndex(e => e.id === eventId)
    if (eIndex !== -1) {
      events[eIndex].total_certificates = count
      events[eIndex].generated_certificates = 0
      events[eIndex].status = 'draft'
      saveDB('events', events)
    }

    logAudit('update', 'event', eventId, `Uploaded attendee Excel sheet (${count} records)`)

    return {
      total_records: count,
      valid_records: count,
      invalid_records: 0,
      columns_found: ['Name', 'Email', 'Course', 'Date'],
      preview_rows: previewRows,
      errors: []
    }
  }

  if (normUrl.match(/\/api\/v1\/events\/[^\/]+\/generate/)) {
    const eventId = normUrl.split('/')[4]
    
    // Simulate background generation
    const eIndex = events.findIndex(e => e.id === eventId)
    if (eIndex !== -1) {
      events[eIndex].status = 'processing'
      saveDB('events', events)
      
      setTimeout(() => {
        const evs = getDB('events', SEED_EVENTS)
        const idx = evs.findIndex(e => e.id === eventId)
        if (idx !== -1) {
          evs[idx].status = 'completed'
          evs[idx].generated_certificates = evs[idx].total_certificates
          saveDB('events', evs)
        }
        const certs = getDB('certificates', SEED_CERTIFICATES)
        certs.forEach(c => {
          if (c.event_id === eventId) {
            c.status = 'generated'
            c.pdf_path = `certificates/${eventId}/${c.id}.pdf`
            c.qr_code_path = `qrcodes/${c.id}.png`
          }
        })
        saveDB('certificates', certs)
      }, 3000)
    }
    
    logAudit('update', 'event', eventId, 'Triggered bulk PDF certificate generation')
    return { message: 'Generation started in the background.' }
  }

  if (normUrl.match(/\/api\/v1\/events\/[^\/]+\/status/)) {
    const eventId = normUrl.split('/')[4]
    const evt = events.find(e => e.id === eventId)
    return {
      status: evt?.status || 'draft',
      total: evt?.total_certificates || 0,
      generated: evt?.status === 'completed' ? (evt?.total_certificates || 0) : 0,
      percent: evt?.status === 'completed' ? 100 : 0
    }
  }

  if (normUrl.match(/\/api\/v1\/events\/[^\/]+\/send-emails/)) {
    const eventId = normUrl.split('/')[4]
    
    const eCerts = certificates.filter(c => c.event_id === eventId)
    eCerts.forEach(c => {
      if (c.status === 'generated' && c.attendee_email) {
        c.status = 'emailed'
        c.email_sent = true
        c.email_sent_at = new Date().toISOString()
      }
    })
    saveDB('certificates', certificates)
    
    logAudit('update', 'event', eventId, 'Triggered bulk emailing of certificates')
    return { message: 'Emails scheduled' }
  }

  // --- Certificates Endpoints ---
  if (normUrl === '/api/v1/certificates/' && method === 'get') {
    const page = parseInt(params?.page || 1)
    const pageSize = parseInt(params?.page_size || 20)
    let filtered = [...certificates]
    if (params?.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(c => 
        c.attendee_name?.toLowerCase().includes(q) ||
        c.attendee_email?.toLowerCase().includes(q) ||
        c.certificate_id?.toLowerCase().includes(q)
      )
    }
    if (params?.status) filtered = filtered.filter(c => c.status === params.status)
    if (params?.event_id) filtered = filtered.filter(c => c.event_id === params.event_id)
    
    const start = (page - 1) * pageSize
    return {
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(filtered.length / pageSize)
    }
  }

  if (normUrl.match(/\/api\/v1\/certificates\/[^\/]+$/)) {
    const id = normUrl.split('/').pop()
    const cert = certificates.find(c => c.id === id)
    if (method === 'get') {
      return cert
    }
    if (method === 'delete') {
      const filtered = certificates.filter(c => c.id !== id)
      saveDB('certificates', filtered)
      logAudit('delete', 'certificate', id, 'Deleted certificate record')
      return { status: 'deleted' }
    }
  }

  if (normUrl.match(/\/api\/v1\/certificates\/[^\/]+\/send-email/)) {
    const id = normUrl.split('/')[4]
    const index = certificates.findIndex(c => c.id === id)
    if (index !== -1) {
      certificates[index].status = 'emailed'
      certificates[index].email_sent = true
      certificates[index].email_sent_at = new Date().toISOString()
      saveDB('certificates', certificates)
      logAudit('update', 'certificate', id, `Emailed certificate to ${certificates[index].attendee_email}`)
    }
    return { message: 'Email sent' }
  }

  if (normUrl.match(/\/api\/v1\/certificates\/[^\/]+\/regenerate/)) {
    const id = normUrl.split('/')[4]
    logAudit('update', 'certificate', id, 'Regenerated certificate PDF')
    return { message: 'Regenerated' }
  }

  // --- Public Verification Endpoint ---
  if (normUrl.match(/\/api\/v1\/verify\/[^\/]+$/)) {
    const certId = normUrl.split('/').pop()
    const cert = certificates.find(c => c.certificate_id === certId || c.id === certId)
    if (cert) {
      const event = events.find(e => e.id === cert.event_id)
      return {
        valid: true,
        certificate_id: cert.certificate_id,
        attendee_name: cert.attendee_name,
        course_name: cert.course_name,
        issue_date: cert.issue_date,
        event_name: event?.name || 'Advanced Workshop',
        status: cert.status,
        message: 'Certificate successfully verified.'
      }
    } else {
      return {
        valid: false,
        certificate_id: certId,
        status: 'not_found',
        message: 'Certificate not found.'
      }
    }
  }
  // --- Email SMTP Endpoints ---
  if (normUrl.endsWith('/api/v1/email/config') && method === 'get') {
    return {
      email_enabled: true,
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_user: 'patelps01911@gmail.com',
      email_from_name: 'Certify Pro'
    }
  }

  if (normUrl.endsWith('/api/v1/email/send-custom') && method === 'post') {
    return {
      status: 'success',
      message: 'Email sent successfully via mock SMTP.'
    }
  }

  return null
}


// Request interceptor: Catch and inject mock responses
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  
  // Check if mock DB is disabled
  const useMockDb = localStorage.getItem('use_mock_db') !== 'false'
  if (!useMockDb) {
    return config
  }
  
  // Try mock handler first
  try {
    const mockRes = handleMockRequest(config.method.toLowerCase(), config.url, config.data, config.params)
    if (mockRes !== null) {
      // Reject Axios request with response structure to handle locally in interceptor
      return Promise.reject({
        config,
        response: {
          data: mockRes,
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        }
      })
    }
  } catch (e) {
    console.error('Mock handler failed', e)
  }
  
  return config
})

// Response interceptor
api.interceptors.response.use(
  res => res,
  err => {
    // Check if it's a mocked response routed via request interceptor
    if (err.config && err.response && err.response.status === 200) {
      return Promise.resolve(err.response)
    }

    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
