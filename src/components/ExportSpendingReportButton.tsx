import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import {
  fetchSpendingReport,
  filterReportByDateRange,
  formatReportDateKey,
} from '../lib/spendingReport'
import './ExportSpendingReportButton.css'

interface ExportSpendingReportButtonProps {
  className?: string
}

type ReportFormat = 'json'

function defaultFileName(): string {
  return `${formatReportDateKey(new Date())}-spending-report`
}

function ExportSpendingReportButton({
  className,
}: ExportSpendingReportButtonProps) {
  const { accessToken } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState(defaultFileName)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [format, setFormat] = useState<ReportFormat>('json')

  const openModal = () => {
    setError('')
    setFileName(defaultFileName())
    setStartDate('')
    setEndDate('')
    setFormat('json')
    setModalOpen(true)
  }

  const closeModal = () => {
    if (loading) {
      return
    }
    setModalOpen(false)
    setError('')
  }

  const handleExport = async () => {
    setLoading(true)
    setError('')

    try {
      const report = await fetchSpendingReport(accessToken)
      const filtered = filterReportByDateRange(report, startDate, endDate)
      const blob = new Blob(
        [JSON.stringify({ 'spending-report': filtered }, null, 2)],
        { type: 'application/json' }
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const base = fileName.trim() || defaultFileName()
      link.download = `${base}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setModalOpen(false)
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
        onClick={openModal}
      >
        Export Spending Report
      </button>

      {modalOpen &&
        createPortal(
          <div className="export-report-overlay" onClick={closeModal}>
          <div
            className="export-report-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Export spending report"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="export-report-modal-header">
              <h2>Export Spending Report</h2>
              <button
                type="button"
                className="export-report-close"
                aria-label="Close export spending report"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <div className="export-report-field">
              <label htmlFor="export-report-filename">File name</label>
              <input
                id="export-report-filename"
                type="text"
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
              />
            </div>

            <div className="export-report-field">
              <span className="export-report-label">Date range</span>
              <div className="export-report-range">
                <input
                  type="date"
                  aria-label="Start date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
                <span className="export-report-range-separator">to</span>
                <input
                  type="date"
                  aria-label="End date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>

            <div className="export-report-field">
              <label htmlFor="export-report-format">Format</label>
              <select
                id="export-report-format"
                value={format}
                onChange={(event) =>
                  setFormat(event.target.value as ReportFormat)
                }
              >
                <option value="json">JSON</option>
              </select>
            </div>

            {error && <p className="export-report-error">{error}</p>}

            <div className="export-report-modal-footer">
              <button
                type="button"
                className="export-report-cancel"
                onClick={closeModal}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="export-report-confirm"
                onClick={handleExport}
                disabled={loading}
              >
                {loading ? 'Exporting…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
          document.body
        )}
    </div>
  )
}

export default ExportSpendingReportButton
