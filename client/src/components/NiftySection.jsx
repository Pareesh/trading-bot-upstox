export default function NiftySection({ status, nifty, loading, onLoadNifty }) {
  const isConnected = status?.connected === true

  return (
    <section className="card">
      <h2>NIFTY 50</h2>
      <div className="row">
        <button type="button" disabled={!isConnected || loading} onClick={onLoadNifty}>
          Load constituents
        </button>
      </div>
      {nifty && (
        <>
          <p className="muted">
            Resolved {nifty.count} / 50 symbols from Upstox NSE instruments.
            {nifty.missingSymbols?.length > 0 && <span> Missing: {nifty.missingSymbols.join(', ')}</span>}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>instrument_key</th>
                </tr>
              </thead>
              <tbody>
                {nifty.companies.map((company) => (
                  <tr key={company.instrument_key}>
                    <td>{company.trading_symbol}</td>
                    <td>{company.name}</td>
                    <td className="mono">{company.instrument_key}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
