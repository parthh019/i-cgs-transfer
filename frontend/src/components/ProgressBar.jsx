export default function ProgressBar({ value = 0, max = 100, label, showPercent = true, color = 'primary', size = 'md', animated = true }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))

  const colorMap = {
    primary: 'from-primary-500 to-primary-600',
    accent: 'from-accent-500 to-accent-600',
    green: 'from-emerald-500 to-emerald-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    gradient: 'from-primary-600 to-accent-600',
  }

  const sizeMap = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
    xl: 'h-6',
  }

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
          {showPercent && (
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {Math.round(percent)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${sizeMap[size]}`}>
        <div
          className={`${sizeMap[size]} rounded-full bg-gradient-to-r ${colorMap[color] || colorMap.primary} transition-all duration-500 ease-out ${animated && percent > 0 && percent < 100 ? 'relative overflow-hidden' : ''}`}
          style={{ width: `${percent}%` }}
        >
          {animated && percent > 0 && percent < 100 && (
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  )
}
