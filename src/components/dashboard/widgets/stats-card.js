/**
 * StatsCard Component
 * 
 * A reusable card component for displaying statistics and metrics
 * in the dashboard.
 * 
 * @component
 * @param {Object} props
 * @param {string} props.title - The title of the statistic
 * @param {string|number} props.value - The value to display
 * @param {string} props.icon - Bootstrap icon class
 * @param {string} [props.trend] - Trend direction ('up' or 'down')
 * @param {number} [props.change] - Percentage change
 */
export default function StatsCard({ title, value, icon, trend, change }) {
  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="text-muted text-uppercase small">{title}</div>
          <div className={`bg-light rounded-circle p-2`}>
            <i className={`bi ${icon} fs-5`}></i>
          </div>
        </div>
        <h3 className="mb-2">{value}</h3>
        {trend && change && (
          <div className={`small ${trend === 'up' ? 'text-success' : 'text-danger'}`}>
            <i className={`bi bi-arrow-${trend} me-1`}></i>
            {change}% since last month
          </div>
        )}
      </div>
    </div>
  )
} 