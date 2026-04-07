import { useMemo, useState } from 'react'

export default function ManualOrderSection({ status, loading, onSubmitOrder, orderResult }) {
  const isConnected = status?.connected === true
  const [form, setForm] = useState({
    instrument_token: '',
    transaction_type: 'BUY',
    quantity: 1,
    product: 'INTRADAY',
    order_type: 'MARKET',
    price: '',
  })
  const [localError, setLocalError] = useState(null)

  const isLimit = form.order_type === 'LIMIT'
  const inputIsValid = form.instrument_token.trim() && Number(form.quantity) > 0 && (!isLimit || form.price !== '')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: name === 'quantity' ? Number(value) : value,
    }))
    setLocalError(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.instrument_token.trim()) {
      setLocalError('Instrument token is required.')
      return
    }
    if (!Number.isFinite(Number(form.quantity)) || Number(form.quantity) <= 0) {
      setLocalError('Quantity must be a positive number.')
      return
    }
    if (isLimit && form.price === '') {
      setLocalError('Limit price is required for LIMIT orders.')
      return
    }

    await onSubmitOrder({
      instrument_token: form.instrument_token.trim(),
      transaction_type: form.transaction_type,
      quantity: Number(form.quantity),
      product: form.product,
      order_type: form.order_type,
      price: form.price === '' ? undefined : Number(form.price),
    })
  }

  const resultSummary = useMemo(() => {
    if (!orderResult) return null
    return orderResult.order_id ? `Order placed: ${orderResult.order_id}` : 'Order response received.'
  }, [orderResult])

  return (
    <section className="card">
      <h2>Manual order</h2>
      <p className="muted">
        Place a single Upstox order manually. Use trusted instrument_token values from the NIFTY 50 data or your own instrument lookup.
      </p>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Instrument token
          <input
            type="text"
            name="instrument_token"
            value={form.instrument_token}
            onChange={handleChange}
            disabled={!isConnected || loading}
            placeholder="e.g. 123456"
          />
        </label>
        <label>
          Transaction type
          <select name="transaction_type" value={form.transaction_type} onChange={handleChange} disabled={!isConnected || loading}>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </label>
        <label>
          Quantity
          <input type="number" name="quantity" value={form.quantity} min="1" onChange={handleChange} disabled={!isConnected || loading} />
        </label>
        <label>
          Product
          <select name="product" value={form.product} onChange={handleChange} disabled={!isConnected || loading}>
            <option value="INTRADAY">INTRADAY</option>
            <option value="MIS">MIS</option>
            <option value="CNC">CNC</option>
          </select>
        </label>
        <label>
          Order type
          <select name="order_type" value={form.order_type} onChange={handleChange} disabled={!isConnected || loading}>
            <option value="MARKET">MARKET</option>
            <option value="LIMIT">LIMIT</option>
          </select>
        </label>
        {isLimit && (
          <label>
            Limit price
            <input
              type="number"
              name="price"
              value={form.price}
              min="0"
              step="0.01"
              onChange={handleChange}
              disabled={!isConnected || loading}
              placeholder="Enter limit price"
            />
          </label>
        )}
        <div className="row">
          <button type="submit" disabled={!isConnected || loading || !inputIsValid}>
            {loading ? 'Sending…' : 'Place order'}
          </button>
        </div>
      </form>
      {localError && <div className="error">{localError}</div>}
      {resultSummary && (
        <div className="out">
          <strong>{resultSummary}</strong>
          <pre className="mono">{JSON.stringify(orderResult, null, 2)}</pre>
        </div>
      )}
    </section>
  )
}
