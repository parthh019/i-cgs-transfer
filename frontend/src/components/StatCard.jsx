import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatCard({ label, value, icon: Icon, iconColor = 'blue', trend, trendLabel, loading }) {
  const colorMap = {
    blue: 'from-blue-500 to-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'from-emerald-500 to-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    purple: 'from-purple-500 to-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange: 'from-orange-500 to-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    red: 'from-red-500 to-red-600 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    yellow: 'from-yellow-500 to-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    indigo: 'from-indigo-500 to-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  }

  const [gradFrom, gradTo, bgCls, textCls] = colorMap[iconColor]?.split(' ') || colorMap.blue.split(' ')

  if (loading) {
    return (
      <div className="stat-card">
        <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24" />
          <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16" />
        </div>
      </div>
    )
  }

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendColor = trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-red-500' : 'text-gray-400'

  return (
    <div className="stat-card group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${colorMap[iconColor].split(' ').slice(2).join(' ')}`}>
        {Icon && <Icon size={22} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
          {label}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
          {value?.toLocaleString() ?? '—'}
        </p>
        {trendLabel && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon size={12} />
            <span>{trendLabel}</span>
          </div>
        )}
      </div>
    </div>
  )
}
