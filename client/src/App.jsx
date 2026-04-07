import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { fetchJson, CONNECT_URL } from './api'
import AccountSection from './components/AccountSection'
import ManualOrderSection from './components/ManualOrderSection'
import NiftySection from './components/NiftySection'
import PositionsSection from './components/PositionsSection'
import StrategySection from './components/StrategySection'
import FundsSection from './components/FundsSection'

function App() {
  const [status, setStatus] = useState(null)
  const [nifty, setNifty] = useState(null)
  const [strategy, setStrategy] = useState(null)
  const [positions, setPositions] = useState(null)
  const [funds, setFunds] = useState(null)
  const [manualOrderResult, setManualOrderResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [actionResult, setActionResult] = useState(null)

  const isBusy = loading

  const handleError = (message) => {
    setError(message)
  }

  const wrapAction = useCallback(async (action) => {
    setLoading(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      handleError(e?.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadStatus = useCallback(async () => {
    const data = await fetchJson('/auth/status')
    setStatus(data)
  }, [])

  useEffect(() => {
    wrapAction(loadStatus)
  }, [loadStatus, wrapAction])

  const fetchNifty = useCallback(async () => {
    const data = await fetchJson('/nifty50')
    setNifty(data)
  }, [])

  const fetchStrategy = useCallback(async () => {
    const data = await fetchJson('/strategy')
    setStrategy(data)
    setActionResult(null)
  }, [])

  const runStrategy = useCallback(async () => {
    const data = await fetchJson('/strategy/run', { method: 'POST' })
    setStrategy(data.signals)
    setActionResult(data)
  }, [])

  const fetchPositions = useCallback(async () => {
    const data = await fetchJson('/positions')
    setPositions(data)
  }, [])

  const fetchFunds = useCallback(async () => {
    const data = await fetchJson('/funds')
    setFunds(data)
  }, [])

  const placeManualOrder = useCallback(async (order) => {
    const data = await fetchJson('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    })
    setManualOrderResult(data)
  }, [])

  const logout = useCallback(async () => {
    await fetchJson('/auth/logout', { method: 'POST' })
    setStatus({ connected: false })
    setNifty(null)
    setStrategy(null)
    setPositions(null)
    setManualOrderResult(null)
    setFunds(null)
  }, [])

  return (
    <div className="app">
      <header className="header">
        <h1>Trading Broker</h1>
      </header>

      <AccountSection
        status={status}
        isLoading={isBusy}
        onLogout={() => wrapAction(logout)}
        connectUrl={CONNECT_URL}
      />

      {error && <div className="error">{error}</div>}

      <FundsSection
        status={status}
        funds={funds}
        loading={isBusy}
        onLoadFunds={() => wrapAction(fetchFunds)}
      />

      <NiftySection status={status} nifty={nifty} loading={isBusy} onLoadNifty={() => wrapAction(fetchNifty)} />

      <StrategySection
        status={status}
        strategy={strategy}
        actionResult={actionResult}
        loading={isBusy}
        onFetchStrategy={() => wrapAction(fetchStrategy)}
        onRunStrategy={() => wrapAction(runStrategy)}
      />

      <ManualOrderSection
        status={status}
        loading={isBusy}
        onSubmitOrder={(order) => wrapAction(() => placeManualOrder(order))}
        orderResult={manualOrderResult}
      />

      <PositionsSection
        status={status}
        positions={positions}
        loading={isBusy}
        onLoadPositions={() => wrapAction(fetchPositions)}
      />

      <footer className="footer fineprint">
        Keep <code>UPSTOX_CLIENT_SECRET</code> and <code>TOKEN_ENCRYPTION_KEY</code> only on the server.
        Enable automated trading only after paper testing. NSE holidays are not handled by the cron job.
      </footer>
    </div>
  )
}

export default App
