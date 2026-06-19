export default function StatusBadge({ status }) {
  const map = {
    pending: { cls: 'badge-yellow', label: 'Pending' },
    generated: { cls: 'badge-blue', label: 'Generated' },
    emailed: { cls: 'badge-green', label: 'Emailed' },
    failed: { cls: 'badge-red', label: 'Failed' },
    draft: { cls: 'badge-gray', label: 'Draft' },
    processing: { cls: 'badge-yellow', label: 'Processing' },
    completed: { cls: 'badge-green', label: 'Completed' },
    sent: { cls: 'badge-green', label: 'Sent' },
    queued: { cls: 'badge-blue', label: 'Queued' },
    active: { cls: 'badge-green', label: 'Active' },
    inactive: { cls: 'badge-gray', label: 'Inactive' },
  }
  const { cls, label } = map[status?.toLowerCase()] || { cls: 'badge-gray', label: status || 'Unknown' }
  return <span className={cls}>{label}</span>
}
