export default function PositionsSection({ status, positions, loading, onLoadPositions }) {
  const isConnected = status?.connected === true

  return (
    <section className="card">
      <h2>Positions</h2>
      <p className="muted">
        View your current short-term Upstox positions. Refresh manually when you want the latest account snapshot.
      </p>
      <div className="row">
        <button type="button" disabled={!isConnected || loading} onClick={onLoadPositions}>
          {loading ? 'Refreshing…' : 'Load positions'}
        </button>
      </div>
      {positions?.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Token</th>
                <th>Qty</th>
                <th>Avg price</th>
                <th>Last price</th>
                <th>Unrealized PnL</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const symbol = pos.trading_symbol || pos.symbol || pos.name || '-'
                const token = pos.instrument_key || pos.instrument_token || '-'
                const qty = pos.quantity ?? pos.net_quantity ?? '-'
                const avgPrice = pos.average_price ?? pos.average_buy_price ?? '-'
                const lastPrice = pos.close_price ?? pos.ltp ?? '-'
                const pnl = pos.unrealized_pnl ?? pos.unrealized_pnl_amount ?? '-'

                return (
                  <tr key={`${token}-${symbol}`}>
                    <td>{symbol}</td>
                    <td className="mono">{token}</td>
                    <td>{qty}</td>
                    <td>{avgPrice}</td>
                    <td>{lastPrice}</td>
                    <td>{pnl}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No positions loaded yet.</p>
      )}
    </section>
  )
}
