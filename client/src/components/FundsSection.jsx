export default function FundsSection({ status, funds, loading, onLoadFunds }) {
  const isConnected = status?.connected === true

  return (
    <section className="card">
      <h2>Funds & Margin</h2>
      <p className="muted">
        View your Upstox account balance and available margin for trading.
      </p>
      <div className="row">
        <button type="button" disabled={!isConnected || loading} onClick={onLoadFunds}>
          {loading ? 'Refreshing…' : 'Load funds'}
        </button>
      </div>
      {funds ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Segment</th>
                <th>Available Margin</th>
                <th>Used Margin</th>
                <th>Available Cash</th>
              </tr>
            </thead>
            <tbody>
              {['equity', 'commodity'].map((segment) => {
                const data = funds[segment]
                if (!data) return null
                return (
                  <tr key={segment}>
                    <td style={{ textTransform: 'capitalize' }}>{segment}</td>
                    <td>{data.available_margin ?? '-'}</td>
                    <td>{data.used_margin ?? '-'}</td>
                    <td>{data.available_cash ?? '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {(!funds.equity && !funds.commodity) && (
            <pre className="mono" style={{ marginTop: '1rem' }}>
              {JSON.stringify(funds, null, 2)}
            </pre>
          )}
        </div>
      ) : (
        <p className="muted">No funds loaded yet.</p>
      )}
    </section>
  )
}
