import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  fetchSpendingReport,
  filterReportByDateRange,
  getCurrentWeekRange,
  sumReportTotal,
  toDateInputValue,
} from '../lib/spendingReport'

export function useWeeklySpending() {
  const { accessToken } = useAuth()
  const [spent, setSpent] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadSpending = async () => {
      setLoading(true)
      try {
        const report = await fetchSpendingReport(accessToken)
        const { start, end } = getCurrentWeekRange()
        const weekReport = filterReportByDateRange(
          report,
          toDateInputValue(start),
          toDateInputValue(end),
        )
        if (!cancelled) {
          setSpent(sumReportTotal(weekReport))
        }
      } catch (error) {
        console.error('Unable to load weekly spending:', error)
        if (!cancelled) {
          setSpent(0)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSpending()

    return () => {
      cancelled = true
    }
  }, [accessToken])

  return { spent, loading }
}
