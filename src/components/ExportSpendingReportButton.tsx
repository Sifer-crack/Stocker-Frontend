import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchSpendingReport } from '../lib/spendingReport'
import './ExportSpendingReportButton.css'

interface ExportSpendingReportButtonProps {
  className?: string
}

function ExportSpendingReportButton({
  className,
}: ExportSpendingReportButtonProps) {
  const { accessToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleExport = async () => {
    setLoading(true)
    setError('')

    try {
      const report = await fetchSpendingReport(accessToken)
      const blob = new Blob(
        [JSON.stringify({ 'spending-report': report }, null, 2)],
        { type: 'application/json' }
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'spending-report.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Unable to export spending report:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Could not export spending report.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="export-report">
      <button
        type="button"
        className={`export-report-button${className ? ` ${className}` : ''}`}
        onClick={handleExport}
        disabled={loading}
      >
        {loading ? 'Exporting…' : 'Export Spending Report'}
      </button>

      {error && <p className="export-report-error">{error}</p>}
    </div>
  )
}

export default ExportSpendingReportButton
