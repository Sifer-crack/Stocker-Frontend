import './Loading.css'

interface LoadingProps {
  message?: string
  fullScreen?: boolean
}

export function Loading({ message = 'Loading...', fullScreen = true }: LoadingProps) {
  return (
    <div className={fullScreen ? 'loading-screen' : 'loading-inline'} role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <p className="loading-message">{message}</p>
    </div>
  )
}

export default Loading
