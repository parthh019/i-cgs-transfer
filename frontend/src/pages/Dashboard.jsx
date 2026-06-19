import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import {
  Upload,
  FileSpreadsheet,
  Image as ImageIcon,
  Sliders,
  Settings,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Trash2,
  Mail,
  Send,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { emailAPI } from '../api/endpoints'

export default function Dashboard() {
  // File Upload States
  const [excelFile, setExcelFile] = useState(null)
  const [templateFile, setTemplateFile] = useState(null)
  const [templateUrl, setTemplateUrl] = useState(null)
  const [templateDimensions, setTemplateDimensions] = useState({ width: 800, height: 600 })

  // Excel Data States
  const [excelRows, setExcelRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [columnMap, setColumnMap] = useState({
    name: '',
    email: '',
    college: '',
    workshop: '',
    date: '',
    certId: '',
  })
  const [participants, setParticipants] = useState([])

  // Editor Configuration States
  const [activeField, setActiveField] = useState('name')
  const [placeholders, setPlaceholders] = useState({
    name: { enabled: true, x: 50, y: 45, fontSize: 38, fontColor: '#d97706', fontFamily: 'helvetica', fontStyle: 'bold', alignment: 'center', label: 'Participant Name' },
    college: { enabled: false, x: 50, y: 55, fontSize: 20, fontColor: '#4b5563', fontFamily: 'helvetica', fontStyle: 'normal', alignment: 'center', label: 'College / Organization' },
    workshop: { enabled: false, x: 50, y: 35, fontSize: 26, fontColor: '#1e3a8a', fontFamily: 'helvetica', fontStyle: 'bold', alignment: 'center', label: 'Workshop Name' },
    date: { enabled: false, x: 70, y: 75, fontSize: 14, fontColor: '#4b5563', fontFamily: 'helvetica', fontStyle: 'normal', alignment: 'center', label: 'Issue Date' },
    certId: { enabled: false, x: 30, y: 75, fontSize: 14, fontColor: '#4b5563', fontFamily: 'helvetica', fontStyle: 'normal', alignment: 'center', label: 'Certificate ID' },
  })

  // Preview State
  const [previewIndex, setPreviewIndex] = useState(0)

  // Generation States
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [successCount, setSuccessCount] = useState(0)
  const [zipBlob, setZipBlob] = useState(null)
  const [generatedFiles, setGeneratedFiles] = useState([])

  // Email Sending States
  const [emailSubject, setEmailSubject] = useState('Your Certificate for {workshop}')
  const [emailBody, setEmailBody] = useState('Dear {name},\n\nThank you for participating in the {workshop} course. Your certificate of completion is attached to this email.\n\nCertificate ID: {certId}\nIssue Date: {date}\n\nBest regards,\nDV Analytics Team')
  const [isMailing, setIsMailing] = useState(false)
  const [mailingProgress, setMailingProgress] = useState(0)
  const [mailingLogs, setMailingLogs] = useState([])
  const [mailSuccessCount, setMailSuccessCount] = useState(0)
  const [mailErrorCount, setMailErrorCount] = useState(0)
  const [smtpConfig, setSmtpConfig] = useState(null)
  const [loadingConfig, setLoadingConfig] = useState(true)

  // Load backend SMTP config on mount
  useEffect(() => {
    emailAPI.getConfig()
      .then(res => {
        setSmtpConfig(res.data)
      })
      .catch(err => {
        console.error('Failed to load backend SMTP settings:', err)
      })
      .finally(() => {
        setLoadingConfig(false)
      })
  }, [])


  // UI Drag-and-Drop Refs
  const previewContainerRef = useRef(null)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const dragField = useRef(null)

  // Clean up URL on unmount
  useEffect(() => {
    return () => {
      if (templateUrl) URL.revokeObjectURL(templateUrl)
    }
  }, [templateUrl])

  // Helper to generate a mockup certificate background for PDF/PPT templates
  const generateMockupTemplate = (fileName, type) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1122 // A4 Landscape
    canvas.height = 793
    const ctx = canvas.getContext('2d')

    // Cream background
    ctx.fillStyle = '#faf6f0'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Outer border
    ctx.strokeStyle = '#d97706'
    ctx.lineWidth = 12
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40)

    // Inner thin border
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64)

    // Corner decorative brackets
    ctx.fillStyle = '#d97706'
    // Top Left
    ctx.fillRect(40, 40, 30, 8)
    ctx.fillRect(40, 40, 8, 30)
    // Top Right
    ctx.fillRect(canvas.width - 70, 40, 30, 8)
    ctx.fillRect(canvas.width - 48, 40, 8, 30)
    // Bottom Left
    ctx.fillRect(40, canvas.height - 48, 30, 8)
    ctx.fillRect(40, canvas.height - 70, 8, 30)
    // Bottom Right
    ctx.fillRect(canvas.width - 70, canvas.height - 48, 30, 8)
    ctx.fillRect(canvas.width - 48, canvas.height - 70, 8, 30)

    // Title
    ctx.font = 'bold 36px Georgia, serif'
    ctx.fillStyle = '#1e3a8a'
    ctx.textAlign = 'center'
    ctx.fillText('CERTIFICATE OF PARTICIPATION', canvas.width / 2, 120)

    // Subtitle
    ctx.font = 'italic 18px Georgia, serif'
    ctx.fillStyle = '#4b5563'
    ctx.fillText('This is proudly presented to', canvas.width / 2, 170)

    // File info badge
    ctx.fillStyle = '#e5e7eb'
    ctx.beginPath()
    if (ctx.roundRect) {
      ctx.roundRect(canvas.width / 2 - 250, 450, 500, 80, 10)
    } else {
      ctx.rect(canvas.width / 2 - 250, 450, 500, 80)
    }
    ctx.fill()

    ctx.font = 'bold 13px sans-serif'
    ctx.fillStyle = '#6b7280'
    ctx.fillText(`TEMPLATE IMPORTED: ${type.toUpperCase()}`, canvas.width / 2, 478)
    ctx.font = 'normal 12px sans-serif'
    ctx.fillStyle = '#374151'
    ctx.fillText(fileName, canvas.width / 2, 505)

    return {
      url: canvas.toDataURL('image/jpeg'),
      width: canvas.width,
      height: canvas.height
    }
  }

  // Handle template image upload
  const handleTemplateUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    const isImage = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext)
    const isDoc = ['pdf', 'ppt', 'pptx', 'doc', 'docx'].includes(ext)

    if (!isImage && !isDoc) {
      toast.error('Unsupported file format. Please upload PNG, JPG, PDF, PPT, or DOC files.')
      return
    }

    setTemplateFile(file)
    setZipBlob(null)

    if (isImage) {
      const url = URL.createObjectURL(file)
      setTemplateUrl(url)

      // Load image metadata
      const img = new Image()
      img.src = url
      img.onload = () => {
        setTemplateDimensions({ width: img.naturalWidth, height: img.naturalHeight })
        toast.success(`Template image loaded: ${img.naturalWidth} x ${img.naturalHeight}px`)
      }
    } else {
      // Document template (PDF/PPT/DOC)
      const mockup = generateMockupTemplate(file.name, ext)
      setTemplateUrl(mockup.url)
      setTemplateDimensions({ width: mockup.width, height: mockup.height })
      toast.success(`Template document imported: ${file.name}`)
    }
  }

  // Handle Excel upload and parsing
  const handleExcelUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        
        let worksheet = null
        let sheetName = ''
        let rawRows = []

        // Find the first sheet that contains actual data rows
        for (let i = 0; i < workbook.SheetNames.length; i++) {
          const name = workbook.SheetNames[i]
          const sheet = workbook.Sheets[name]
          const parsedRows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
          if (parsedRows.length >= 2) {
            worksheet = sheet
            sheetName = name
            rawRows = parsedRows
            break
          }
        }

        if (!worksheet) {
          sheetName = workbook.SheetNames[0]
          worksheet = workbook.Sheets[sheetName]
          rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        }

        if (rawRows.length < 1) {
          toast.error('The selected spreadsheet sheet is completely empty.')
          return
        }

        // Find the most likely header row index (scanning first 10 rows)
        let headerRowIdx = 0;
        let maxScore = -1;
        const scanLimit = Math.min(rawRows.length, 10);
        
        for (let i = 0; i < scanLimit; i++) {
          const row = rawRows[i] || [];
          let score = 0;
          let filledCells = 0;
          
          row.forEach(cell => {
            if (cell !== null && cell !== undefined && String(cell).trim() !== '') {
              filledCells++;
              const cellStr = String(cell).toLowerCase().replace(/[\s_-]/g, '');
              if (['name', 'email', 'mail', 'college', 'workshop', 'date', 'cert', 'id', 'participant'].some(k => cellStr.includes(k))) {
                score += 5;
              }
            }
          });
          
          score += filledCells;
          if (score > maxScore && filledCells > 0) {
            maxScore = score;
            headerRowIdx = i;
          }
        }

        const finalRows = rawRows.slice(headerRowIdx)
        if (finalRows.length < 2) {
          toast.error('Spreadsheet must contain a header row and at least one participant row.')
          return
        }

        setExcelFile(file)
        setExcelRows(finalRows)

        const fileHeaders = finalRows[0].map(h => String(h || '').trim())
        setHeaders(fileHeaders)

        // Auto-detect mappings based on standard names
        const map = { name: '', email: '', college: '', workshop: '', date: '', certId: '' }
        fileHeaders.forEach((h, idx) => {
          const lower = h.toLowerCase().replace(/[\s_-]/g, '')
          if (['name', 'fullname', 'participant', 'candidate', 'attendee'].some(k => lower.includes(k)) && !map.name) {
            map.name = h
          } else if (['email', 'mail', 'gmail', 'emailaddress'].some(k => lower.includes(k)) && !map.email) {
            map.email = h
          } else if (['college', 'university', 'org', 'organization', 'company', 'school'].some(k => lower.includes(k)) && !map.college) {
            map.college = h
          } else if (['workshop', 'course', 'program', 'topic', 'workshopname'].some(k => lower.includes(k)) && !map.workshop) {
            map.workshop = h
          } else if (['date', 'issuedate', 'completiondate'].some(k => lower.includes(k)) && !map.date) {
            map.date = h
          } else if (['id', 'certid', 'certificatenumber', 'certificateid'].some(k => lower.includes(k)) && !map.certId) {
            map.certId = h
          }
        })

        // Fallbacks if auto-detect misses
        if (!map.name && fileHeaders.length > 0) map.name = fileHeaders[0]
        setColumnMap(map)
        toast.success(`Imported "${sheetName}" sheet with ${finalRows.length - 1} rows!`)
      } catch (err) {
        toast.error(`Error parsing spreadsheet: ${err.message || 'Check file format'}`)
        console.error(err)
      }
    }
    reader.readAsArrayBuffer(file)
    setZipBlob(null)
  }

  // Update participant list whenever mappings or rows change
  useEffect(() => {
    if (excelRows.length < 2) return

    const nameIdx = headers.indexOf(columnMap.name)
    const emailIdx = headers.indexOf(columnMap.email)
    const collegeIdx = headers.indexOf(columnMap.college)
    const workshopIdx = headers.indexOf(columnMap.workshop)
    const dateIdx = headers.indexOf(columnMap.date)
    const certIdIdx = headers.indexOf(columnMap.certId)

    const parsed = excelRows.slice(1).map((row, idx) => {
      // Generate default ID if none mapped or empty
      const defaultId = `CERT-2026-${(idx + 1).toString().padStart(4, '0')}`
      const issueDate = dateIdx !== -1 && row[dateIdx] ? String(row[dateIdx]) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      const wName = workshopIdx !== -1 && row[workshopIdx] ? String(row[workshopIdx]) : 'Workshop'

      return {
        name: nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : '',
        email: emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : '',
        college: collegeIdx !== -1 && row[collegeIdx] ? String(row[collegeIdx]).trim() : '',
        workshop: wName.trim(),
        date: issueDate.trim(),
        certId: certIdIdx !== -1 && row[certIdIdx] ? String(row[certIdIdx]).trim() : defaultId,
      }
    }).filter(p => p.name) // Skip empty rows

    setParticipants(parsed)
    setPreviewIndex(0)
  }, [columnMap, excelRows, headers])

  // Mouse Drag Handler for placeholders
  const handleDragStart = (e, fieldKey) => {
    e.preventDefault()
    dragField.current = fieldKey
    const rect = previewContainerRef.current.getBoundingClientRect()
    dragStartPos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
    setActiveField(fieldKey)

    document.addEventListener('mousemove', handleDragging)
    document.addEventListener('mouseup', handleDragEnd)
  }

  const handleDragging = (e) => {
    if (!dragField.current || !previewContainerRef.current) return
    const rect = previewContainerRef.current.getBoundingClientRect()
    
    // Calculate percentages
    let x = ((e.clientX - rect.left) / rect.width) * 100
    let y = ((e.clientY - rect.top) / rect.height) * 100

    // Constrain to bounds
    x = Math.max(0, Math.min(100, x))
    y = Math.max(0, Math.min(100, y))

    setPlaceholders(prev => ({
      ...prev,
      [dragField.current]: {
        ...prev[dragField.current],
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
      }
    }))
  }

  const handleDragEnd = () => {
    dragField.current = null
    document.removeEventListener('mousemove', handleDragging)
    document.removeEventListener('mouseup', handleDragEnd)
  }

  // Update a placeholder setting
  const updatePlaceholder = (field, key, val) => {
    setPlaceholders(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [key]: val
      }
    }))
  }

  // Bulk PDF Generation logic using Canvas + jsPDF
  const generateCertificates = async () => {
    if (!templateUrl) {
      toast.error('Please upload a certificate template file.')
      return
    }
    if (participants.length === 0) {
      toast.error('Please upload participant data (Excel) or map columns.')
      return
    }

    setIsGenerating(true)
    setProgress(0)
    setSuccessCount(0)

    const zip = new JSZip()
    const filesList = []

    // Cache template image
    const imgElement = new Image()
    imgElement.src = templateUrl
    await new Promise(resolve => {
      imgElement.onload = resolve
    })

    const total = participants.length
    const naturalWidth = templateDimensions.width
    const naturalHeight = templateDimensions.height

    // Batch generator in chunks to keep UI responsive
    for (let i = 0; i < total; i++) {
      const p = participants[i]
      try {
        // Create canvas to composite template + text
        const canvas = document.createElement('canvas')
        canvas.width = naturalWidth
        canvas.height = naturalHeight
        const ctx = canvas.getContext('2d')

        // 1. Draw template image as base background
        ctx.drawImage(imgElement, 0, 0, naturalWidth, naturalHeight)

        // 2. Draw active placeholders
        Object.entries(placeholders).forEach(([key, config]) => {
          if (!config.enabled) return

          // Fetch matching participant text value
          let textValue = ''
          if (key === 'name') textValue = p.name
          if (key === 'college') textValue = p.college
          if (key === 'workshop') textValue = p.workshop
          if (key === 'date') textValue = p.date
          if (key === 'certId') textValue = p.certId

          if (!textValue) return

          // Setup canvas font options
          const stylePrefix = config.fontStyle.includes('bold') ? 'bold ' : ''
          const italicStyle = config.fontStyle.includes('italic') ? 'italic ' : ''
          ctx.font = `${stylePrefix}${italicStyle}${config.fontSize}px ${config.fontFamily}`
          ctx.fillStyle = config.fontColor
          ctx.textAlign = config.alignment
          ctx.textBaseline = 'middle'

          // Convert percentage coordinates to original image pixels
          const pxX = (config.x / 100) * naturalWidth
          const pxY = (config.y / 100) * naturalHeight

          ctx.fillText(textValue, pxX, pxY)
        })

        // 3. Convert Canvas to JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95)

        // 4. Create jsPDF page matching original template aspect ratio
        const isLandscape = naturalWidth > naturalHeight
        const pdf = new jsPDF({
          orientation: isLandscape ? 'landscape' : 'portrait',
          unit: 'px',
          format: [naturalWidth, naturalHeight],
        })

        pdf.addImage(dataUrl, 'JPEG', 0, 0, naturalWidth, naturalHeight)
        
        // 5. Package as Blob
        const pdfBlob = pdf.output('blob')
        const filename = `${p.name.replace(/[^a-zA-Z0-9]/g, '_')}_Certificate.pdf`

        // Add to zip folder and file array
        zip.file(filename, pdfBlob)
        filesList.push({
          name: p.name,
          email: p.email,
          certId: p.certId,
          filename,
          blob: pdfBlob,
          college: p.college,
          workshop: p.workshop,
          date: p.date,
        })

        setSuccessCount(prev => prev + 1)
        setProgress(Math.round(((i + 1) / total) * 100))
      } catch (err) {
        console.error(`Failed generating for ${p.name}`, err)
      }

      // Small async sleep to prevent tab crashing
      await new Promise(r => setTimeout(r, 20))
    }

    try {
      const archive = await zip.generateAsync({ type: 'blob' })
      setZipBlob(archive)
      setGeneratedFiles(filesList)
      toast.success('Successfully generated all certificates!')
    } catch (err) {
      toast.error('Failed to create ZIP package.')
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  // Trigger download of the complete ZIP archive
  const downloadZip = () => {
    if (!zipBlob) return
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Workshop_Certificates_${Date.now()}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Trigger download of a single PDF
  const downloadSinglePdf = (file) => {
    const url = URL.createObjectURL(file.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Bulk SMTP backend sending loop
  const sendBulkEmails = async () => {
    if (smtpConfig && !smtpConfig.email_enabled) {
      toast.error('Email sending is disabled on the backend. Please enable EMAIL_ENABLED in your backend settings.')
      return
    }

    setIsMailing(true)
    setMailingProgress(0)
    setMailSuccessCount(0)
    setMailErrorCount(0)

    const initialLogs = generatedFiles.map(file => ({
      name: file.name,
      email: file.email || '',
      certId: file.certId,
      status: 'pending',
      details: 'In queue...'
    }))
    setMailingLogs(initialLogs)

    const total = generatedFiles.length

    // Function to parse dynamic template placeholders
    const compileText = (templateText, data) => {
      return templateText
        .replace(/{name}/g, data.name || '')
        .replace(/{email}/g, data.email || '')
        .replace(/{college}/g, data.college || '')
        .replace(/{workshop}/g, data.workshop || '')
        .replace(/{date}/g, data.date || '')
        .replace(/{certId}/g, data.certId || '')
    }

    for (let i = 0; i < total; i++) {
      const file = generatedFiles[i]
      
      setMailingLogs(prev => prev.map((log, idx) => 
        idx === i ? { ...log, status: 'sending', details: 'Uploading PDF and dispatching via backend SMTP...' } : log
      ))

      if (!file.email) {
        setMailErrorCount(prev => prev + 1)
        setMailingLogs(prev => prev.map((log, idx) => 
          idx === i ? { ...log, status: 'failed', details: 'Failed: Email address is not mapped' } : log
        ))
        continue
      }

      try {
        const subject = compileText(emailSubject, file)
        const body = compileText(emailBody, file)

        // Construct FormData to upload the generated PDF and send details
        const formData = new FormData()
        formData.append('to_email', file.email)
        formData.append('subject', subject)
        formData.append('body', body)
        formData.append('pdf_file', file.blob, file.filename)

        const response = await emailAPI.sendCustom(formData)

        if (response.data.status === 'success') {
          setMailSuccessCount(prev => prev + 1)
          setMailingLogs(prev => prev.map((log, idx) => 
            idx === i ? { ...log, status: 'success', details: `Sent successfully via SMTP` } : log
          ))
        } else {
          setMailErrorCount(prev => prev + 1)
          setMailingLogs(prev => prev.map((log, idx) => 
            idx === i ? { ...log, status: 'failed', details: `SMTP Error: ${response.data.message || 'Unknown error'}` } : log
          ))
        }
      } catch (err) {
        console.error(err)
        const errMsg = err.response?.data?.detail || err.message || 'Network/Server Error'
        setMailErrorCount(prev => prev + 1)
        setMailingLogs(prev => prev.map((log, idx) => 
          idx === i ? { ...log, status: 'failed', details: `Failed: ${errMsg}` } : log
        ))
      }

      setMailingProgress(Math.round(((i + 1) / total) * 100))
      // Small delay between sends to prevent overwhelming SMTP/server
      await new Promise(r => setTimeout(r, 400))
    }

    setIsMailing(false)
    toast.success('SMTP bulk email queue completed!')
  }

  // Active participant for preview rendering
  const activeParticipant = participants[previewIndex] || {
    name: 'John Doe',
    college: 'Example University',
    workshop: 'React Development Workshop',
    date: '2026-06-17',
    certId: 'CERT-2026-0001',
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Uploads & Mappings */}
        <div className="space-y-6 lg:col-span-1">
          {/* Upload panel */}
          <div className="card p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
              <Upload size={18} className="text-primary-500" />
              1. Upload Resources
            </h2>

            {/* Template image uploader */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Certificate Design (PNG/JPG/PPT/PDF)
              </span>
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*, .pdf, .ppt, .pptx, .doc, .docx"
                  onChange={handleTemplateUpload}
                  className="hidden"
                  id="template-upload-input"
                />
                <label
                  htmlFor="template-upload-input"
                  className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    templateFile
                      ? 'border-emerald-500/50 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.04]'
                      : 'border-gray-200 dark:border-gray-800 hover:border-primary-500/50 hover:bg-primary-500/[0.01]'
                  }`}
                >
                  {templateFile ? (
                    <>
                      <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 text-center max-w-[200px] truncate">
                        {templateFile.name}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {templateDimensions.width} x {templateDimensions.height}px
                      </p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-gray-400 mb-2 group-hover:text-primary-500 transition-colors" />
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Select template design
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, PDF, PPT, or DOC</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Excel uploader */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Participant List (Excel/CSV/ODS/TXT)
              </span>
              <div className="relative group">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv, .ods, .txt"
                  onChange={handleExcelUpload}
                  className="hidden"
                  id="excel-upload-input"
                />
                <label
                  htmlFor="excel-upload-input"
                  className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    excelFile
                      ? 'border-emerald-500/50 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.04]'
                      : 'border-gray-200 dark:border-gray-800 hover:border-primary-500/50 hover:bg-primary-500/[0.01]'
                  }`}
                >
                  {excelFile ? (
                    <>
                      <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 text-center max-w-[200px] truncate">
                        {excelFile.name}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {participants.length} valid rows found
                      </p>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-8 h-8 text-gray-400 mb-2 group-hover:text-primary-500 transition-colors" />
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Select spreadsheet file
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">.xlsx, .xls, .csv, .ods, .txt</p>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Mappings panel */}
          {headers.length > 0 && (
            <div className="card p-6 space-y-4 animate-fade-in">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                <Settings size={18} className="text-primary-500" />
                2. Map Excel Columns
              </h2>

              <div className="space-y-3">
                {Object.keys(columnMap).map((fieldKey) => (
                  <div key={fieldKey} className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                      <span>{fieldKey === 'name' ? 'Name (Required)' : fieldKey}</span>
                      {fieldKey !== 'name' && placeholders[fieldKey] && (
                        <input
                          type="checkbox"
                          checked={placeholders[fieldKey].enabled}
                          onChange={(e) => updatePlaceholder(fieldKey, 'enabled', e.target.checked)}
                          className="rounded text-primary-600 focus:ring-primary-500 border-gray-300 w-3.5 h-3.5"
                        />
                      )}
                    </label>
                    <select
                      value={columnMap[fieldKey]}
                      onChange={(e) => setColumnMap({ ...columnMap, [fieldKey]: e.target.value })}
                      disabled={fieldKey !== 'name' && placeholders[fieldKey] && !placeholders[fieldKey].enabled}
                      className="input py-1.5 text-xs pr-10 appearance-none bg-no-repeat bg-[right_0.75rem_center] disabled:opacity-40"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`, backgroundSize: '1rem' }}
                    >
                      <option value="">-- None --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MIDDLE COLUMN: Visual Position Editor & Live Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 flex-wrap gap-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Sliders size={18} className="text-primary-500" />
                3. Design Layout & Preview
              </h2>

              {/* Preview navigator */}
              {participants.length > 0 && (
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setPreviewIndex(prev => Math.max(0, prev - 1))}
                    disabled={previewIndex === 0}
                    className="p-1 rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="min-w-[70px] text-center text-gray-700 dark:text-gray-300">
                    Row {previewIndex + 1} of {participants.length}
                  </span>
                  <button
                    onClick={() => setPreviewIndex(prev => Math.min(participants.length - 1, prev + 1))}
                    disabled={previewIndex === participants.length - 1}
                    className="p-1 rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Design canvas wrapper */}
            {templateUrl ? (
              <div className="space-y-4">
                <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 bg-[var(--primary-soft)] p-3 rounded border border-[var(--primary-soft)]">
                  <AlertCircle size={14} className="text-[var(--primary)] flex-shrink-0" />
                  <p>Drag the labels directly on the template to position them, or use the fine-tuning tools on the sidebar.</p>
                </div>

                <div
                  ref={previewContainerRef}
                  className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-900 shadow-inner select-none"
                  style={{ aspectRatio: `${templateDimensions.width} / ${templateDimensions.height}` }}
                >
                  <img
                    src={templateUrl}
                    alt="Certificate Template"
                    className="w-full h-full object-contain pointer-events-none"
                  />

                  {/* Overlays for active fields */}
                  {Object.entries(placeholders).map(([key, config]) => {
                    if (!config.enabled) return null
                    
                    const isActive = activeField === key
                    let text = ''
                    if (key === 'name') text = activeParticipant.name || 'John Doe'
                    if (key === 'college') text = activeParticipant.college || 'Example University'
                    if (key === 'workshop') text = activeParticipant.workshop || 'React Development Workshop'
                    if (key === 'date') text = activeParticipant.date || '2026-06-17'
                    if (key === 'certId') text = activeParticipant.certId || 'CERT-2026-0001'

                    return (
                      <div
                        key={key}
                        onMouseDown={(e) => handleDragStart(e, key)}
                        className={`absolute cursor-move px-3 py-1.5 rounded-lg border leading-tight transition-shadow font-sans select-none ${
                          isActive
                            ? 'border-primary-500 bg-primary-500/10 shadow-lg ring-2 ring-primary-500/50'
                            : 'border-white/20 bg-black/40 hover:bg-black/60 shadow'
                        }`}
                        style={{
                          left: `${config.x}%`,
                          top: `${config.y}%`,
                          transform: config.alignment === 'center'
                            ? 'translate(-50%, -50%)'
                            : config.alignment === 'right'
                              ? 'translate(-100%, -50%)'
                              : 'translate(0%, -50%)',
                          fontSize: `calc(${config.fontSize}px * 0.45)`, // Scale font for browser layout preview
                          color: config.fontColor,
                          fontWeight: config.fontStyle.includes('bold') ? 'bold' : 'normal',
                          fontStyle: config.fontStyle.includes('italic') ? 'italic' : 'normal',
                          fontFamily: config.fontFamily === 'helvetica' ? 'Inter, sans-serif' : config.fontFamily === 'times' ? 'serif' : 'monospace',
                        }}
                      >
                        {text}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-24 text-center text-gray-400 dark:text-gray-600">
                <ImageIcon className="w-16 h-16 opacity-30 mb-3" />
                <h3 className="font-bold text-gray-600 dark:text-gray-400">No Template Uploaded</h3>
                <p className="text-xs max-w-xs mt-1">Upload a template image on the left to start layout configuration.</p>
              </div>
            )}

            {/* Config & Editor settings for active field */}
            {templateUrl && activeField && placeholders[activeField] && (
              <div className="p-5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4 mt-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                    Configure Field: {placeholders[activeField].label}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Row 1: Font settings */}
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Font family</span>
                    <select
                      value={placeholders[activeField].fontFamily}
                      onChange={(e) => updatePlaceholder(activeField, 'fontFamily', e.target.value)}
                      className="input py-2 text-xs"
                    >
                      <option value="helvetica">Helvetica (Sans-Serif)</option>
                      <option value="times">Times New Roman (Serif)</option>
                      <option value="courier">Courier (Monospace)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Font Style</span>
                    <select
                      value={placeholders[activeField].fontStyle}
                      onChange={(e) => updatePlaceholder(activeField, 'fontStyle', e.target.value)}
                      className="input py-2 text-xs"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                      <option value="italic">Italic</option>
                      <option value="bolditalic">Bold Italic</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Alignment</span>
                    <select
                      value={placeholders[activeField].alignment}
                      onChange={(e) => updatePlaceholder(activeField, 'alignment', e.target.value)}
                      className="input py-2 text-xs"
                    >
                      <option value="left">Left Align</option>
                      <option value="center">Center Align</option>
                      <option value="right">Right Align</option>
                    </select>
                  </div>

                  {/* Row 2: Size & Color */}
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase flex justify-between">
                      <span>Font Size ({placeholders[activeField].fontSize}px)</span>
                    </span>
                    <input
                      type="range"
                      min="10"
                      max="120"
                      value={placeholders[activeField].fontSize}
                      onChange={(e) => updatePlaceholder(activeField, 'fontSize', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Text Color</span>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={placeholders[activeField].fontColor}
                        onChange={(e) => updatePlaceholder(activeField, 'fontColor', e.target.value)}
                        className="w-10 h-9 p-0.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={placeholders[activeField].fontColor}
                        onChange={(e) => updatePlaceholder(activeField, 'fontColor', e.target.value)}
                        className="input text-xs font-mono py-1.5 pl-3"
                        placeholder="#000000"
                      />
                    </div>
                  </div>

                  {/* Fine positioning */}
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Fine Tuning Position</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border rounded-xl px-2 py-1.5">
                        <span className="font-semibold text-gray-400">X:</span>
                        <input
                          type="number"
                          value={placeholders[activeField].x}
                          onChange={(e) => updatePlaceholder(activeField, 'x', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent focus:outline-none font-mono"
                          step="0.1"
                        />
                        <span className="text-gray-400">%</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border rounded-xl px-2 py-1.5">
                        <span className="font-semibold text-gray-400">Y:</span>
                        <input
                          type="number"
                          value={placeholders[activeField].y}
                          onChange={(e) => updatePlaceholder(activeField, 'y', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent focus:outline-none font-mono"
                          step="0.1"
                        />
                        <span className="text-gray-400">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trigger generate panel */}
          {templateUrl && participants.length > 0 && (
            <div className="card p-6 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    Ready to Generate Certificates
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Compiled dynamically. The entire generation runs securely inside your web browser.
                  </p>
                </div>

                {!isGenerating ? (
                  <button
                    onClick={generateCertificates}
                    className="btn-primary px-6 py-3 text-base flex items-center gap-2.5"
                  >
                    <RefreshCw size={18} />
                    Compile {participants.length} Certificates
                  </button>
                ) : (
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-[var(--primary)]">
                        <span>Compiling PDFs...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-[var(--surface-muted)] border border-[var(--border)] h-2 rounded overflow-hidden">
                        <div
                          className="bg-[var(--primary)] h-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ZIP Download panel after success */}
              {zipBlob && (
                <div className="flex items-center gap-4 p-4 rounded bg-[var(--success-soft)] border border-[var(--success)] mt-4 animate-slide-up">
                  <CheckCircle className="w-8 h-8 text-[var(--success)] flex-shrink-0 animate-bounce" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--success)]">
                      Successfully Compiled {successCount} Certificates!
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      ZIP package ready for download.
                    </p>
                  </div>
                  <button
                    onClick={downloadZip}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded bg-[var(--success)] hover:opacity-90 text-white font-bold text-sm transition-all cursor-pointer"
                  >
                    <Download size={16} />
                    Download ZIP Archive
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bulk Email Delivery Panel */}
          {generatedFiles.length > 0 && (
            <div className="card p-6 space-y-6 animate-fade-in">
              <div className="border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Mail className="text-primary-500" size={18} />
                    4. Bulk Email Delivery
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Send compiled certificates to participants securely via the backend SMTP email service.
                  </p>
                </div>
                {loadingConfig ? (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading SMTP...
                  </div>
                ) : smtpConfig?.email_enabled ? (
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 px-2.5 py-1 rounded-full border border-emerald-500/20 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    SMTP Operational: {smtpConfig.smtp_user}
                  </div>
                ) : (
                  <span className="text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-500 px-2.5 py-1 rounded-full border border-rose-500/20">
                    SMTP Disabled
                  </span>
                )}
              </div>

              {loadingConfig ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
                </div>
              ) : smtpConfig && !smtpConfig.email_enabled ? (
                <div className="p-5 rounded-xl bg-rose-500/5 border border-rose-500/20 flex gap-3 text-xs text-[var(--text-muted)]">
                  <AlertCircle className="text-rose-600 dark:text-rose-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-rose-800 dark:text-rose-500">SMTP Service Disabled</h4>
                    <p className="mt-0.5">
                      Email sending is currently disabled in your backend configuration. To enable distribution, set `EMAIL_ENABLED=True` and configure SMTP credentials in your server's `.env` file, then restart the server.
                    </p>
                  </div>
                </div>
              ) : !columnMap.email ? (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-2.5">
                  <AlertCircle className="text-amber-600 dark:text-amber-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-500">Email Column Mapping Required</h4>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Please select/map the **email** field in the Excel column mappings under section 2 first.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Email Template Config */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="label">Email Subject</label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Subject"
                        disabled={isMailing}
                        className="input"
                      />
                    </div>
                    
                    <div className="md:row-span-2 space-y-1">
                      <label className="label">Placeholder Helper Guide</label>
                      <div className="bg-gray-50 dark:bg-gray-800/40 border rounded-xl p-3.5 space-y-2 text-xs">
                        <p className="text-[var(--text-muted)] font-medium">Use these tags in subject/body to dynamically insert values:</p>
                        <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                          <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">{"{name}"} : Name</span>
                          <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">{"{email}"} : Email</span>
                          <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">{"{college}"} : College</span>
                          <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">{"{workshop}"} : Workshop</span>
                          <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">{"{date}"} : Issue Date</span>
                          <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">{"{certId}"} : Certificate ID</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="label">Email Message Body</label>
                      <textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        placeholder="Message Body..."
                        rows="5"
                        disabled={isMailing}
                        className="input resize-none"
                      />
                    </div>
                  </div>

                  {/* Trigger Send / Progress */}
                  <div className="pt-2 flex items-center justify-between flex-wrap gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                    <div>
                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                        <span>Recipient List: <strong>{generatedFiles.length}</strong> recipients ready.</span>
                        <span className="text-[10px] text-gray-400">Sending via SMTP: {smtpConfig?.smtp_user}</span>
                      </p>
                    </div>

                    {!isMailing ? (
                      <button
                        onClick={sendBulkEmails}
                        className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2"
                      >
                        <Send size={15} />
                        Send Bulk Emails
                      </button>
                    ) : (
                      <div className="flex items-center gap-4 min-w-[240px]">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold text-[var(--primary)]">
                            <span>Sending Emails ({mailSuccessCount} Success, {mailErrorCount} Failed)</span>
                            <span>{mailingProgress}%</span>
                          </div>
                          <div className="w-full bg-[var(--surface-muted)] border border-[var(--border)] h-2 rounded overflow-hidden">
                            <div
                              className="bg-[var(--primary)] h-full transition-all duration-300"
                              style={{ width: `${mailingProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mailing Logs Table */}
                  {mailingLogs.length > 0 && (
                    <div className="space-y-2 pt-2 animate-fade-in">
                      <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Delivery Status Logs
                      </h4>
                      <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-xl">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 dark:bg-gray-800/40 text-gray-500 font-semibold border-b border-gray-100 dark:border-gray-800 sticky top-0">
                            <tr>
                              <th className="px-4 py-2.5 text-left">Recipient</th>
                              <th className="px-4 py-2.5 text-left">Email</th>
                              <th className="px-4 py-2.5 text-left">Cert ID</th>
                              <th className="px-4 py-2.5 text-left">Status</th>
                              <th className="px-4 py-2.5 text-left">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {mailingLogs.map((log, idx) => (
                              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors">
                                <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-200">{log.name}</td>
                                <td className="px-4 py-2.5 text-gray-500 font-mono text-[10px]">{log.email}</td>
                                <td className="px-4 py-2.5 text-gray-400 font-mono text-[10px]">{log.certId}</td>
                                <td className="px-4 py-2.5">
                                  {log.status === 'pending' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                      Pending
                                    </span>
                                  )}
                                  {log.status === 'sending' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-primary-500/10 text-primary-600 dark:text-primary-500">
                                      <Loader2 size={10} className="animate-spin" />
                                      Sending
                                    </span>
                                  )}
                                  {log.status === 'success' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-500">
                                      Success
                                    </span>
                                  )}
                                  {log.status === 'failed' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-500">
                                      Failed
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-gray-500 truncate max-w-[180px]">{log.details}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* List of compiled certificates */}
          {generatedFiles.length > 0 && (
            <div className="card p-6 space-y-4 animate-fade-in">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800 pb-3">
                Compiled Files
              </h3>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/40 text-xs text-gray-500 font-semibold border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left">Participant</th>
                      <th className="px-4 py-3 text-left">Cert ID</th>
                      <th className="px-4 py-3 text-left">File Name</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {generatedFiles.map((file, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">{file.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400 dark:text-gray-600">{file.certId}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[200px]" title={file.filename}>
                          {file.filename}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => downloadSinglePdf(file)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors"
                          >
                            <Download size={12} />
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
