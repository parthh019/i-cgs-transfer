import { format, parseISO } from 'date-fns'

export const formatDate = (date) => {
  if (!date) return '-'
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, 'MMM dd, yyyy')
  } catch {
    return date
  }
}

export const formatDateTime = (date) => {
  if (!date) return '-'
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, 'MMM dd, yyyy HH:mm')
  } catch {
    return date
  }
}

export const truncate = (str, n = 30) =>
  str?.length > n ? str.slice(0, n) + '...' : str

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export const getStatusColor = (status) => {
  const map = {
    pending: 'yellow',
    generated: 'blue',
    emailed: 'green',
    failed: 'red',
    draft: 'gray',
    processing: 'yellow',
    completed: 'green',
  }
  return map[status] || 'gray'
}
