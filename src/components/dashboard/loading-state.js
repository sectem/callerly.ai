/**
 * LoadingState Component
 * 
 * Displays a loading indicator for async operations.
 * 
 * @component
 * @param {Object} props
 * @param {string} [props.message='Loading...'] - Loading message to display
 */
export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary mb-3" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="text-muted">{message}</p>
    </div>
  )
} 