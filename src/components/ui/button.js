export default function Button({ 
  children, 
  loading, 
  loadingText, 
  className = '', 
  style = {}, 
  ...props 
}) {
  return (
    <button
      className={`btn ${className}`}
      style={{
        maxWidth: '200px',
        margin: '0 auto',
        display: 'block',
        ...style
      }}
      disabled={loading}
      {...props}
    >
      {loading ? loadingText : children}
    </button>
  )
} 