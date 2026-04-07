function StrategyList({ title, items, renderItem }) {
  return (
    <>
      <h3>{title}</h3>
      <ul>
        {items?.length ? items.map(renderItem) : <li className="muted">None</li>}
      </ul>
    </>
  )
}

function ActionResult({ result }) {
  if (!result) return null

  return (
    <div className="out">
      <strong>Last strategy result</strong>
      <pre className="mono">{JSON.stringify(result, null, 2)}</pre>
    </div>
  )
}

export default function StrategySection({ status, strategy, actionResult, loading, onFetchStrategy, onRunStrategy }) {
  const isConnected = status?.connected === true

  return (
    <section className="card">
      <h2>Strategy signals</h2>
      <p className="muted">
        Ranks NIFTY50 using intraday + historical data; sells use charge-aware optimal locks, defensive trims,
        and stop-loss (see server strategy config). Tune logic in <code>server/src/services/strategy.js</code>.
      </p>
      <div className="row">
        <button type="button" disabled={!isConnected || loading} onClick={onFetchStrategy}>
          {loading ? 'Loading…' : 'Refresh signals'}
        </button>
        <button type="button" disabled={!isConnected || loading} onClick={onRunStrategy}>
          {loading ? 'Running…' : 'Run strategy'}
        </button>
      </div>
      {strategy && (
        <div className="signals">
          <StrategyList
            title="Buy ideas"
            items={strategy.buys}
            renderItem={(buy) => (
              <li key={buy.trading_symbol}>
                <strong>{buy.trading_symbol}</strong> — {buy.intradayPct?.toFixed(2)}% vs open · {buy.reason}
              </li>
            )}
          />
          <StrategyList
            title="Sell / risk-off"
            items={strategy.sells}
            renderItem={(sell) => (
              <li key={sell.trading_symbol}>
                <strong>{sell.trading_symbol}</strong> — {sell.reason}
              </li>
            )}
          />
          {strategy.notes?.map((note, index) => (
            <p key={`${note}-${index}`} className="fineprint">
              {note}
            </p>
          ))}
          <ActionResult result={actionResult} />
        </div>
      )}
    </section>
  )
}
