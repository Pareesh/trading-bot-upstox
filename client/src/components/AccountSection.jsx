import { useMemo } from 'react'

export default function AccountSection({ status, isLoading, onLogout, connectUrl }) {
  const isConnected = status?.connected === true
  const displayName = useMemo(
    () => status?.profile?.user_name || status?.profile?.user_id || '',
    [status],
  )

  return (
    <section className="card">
      <h2>Account</h2>
      {isConnected ? (
        <div className="row">
          <p>
            Connected{displayName ? ` · ${displayName}` : ''}
          </p>
          <button type="button" onClick={onLogout} disabled={isLoading}>
            Disconnect
          </button>
        </div>
      ) : (
        <div className="row">
          <p>Not connected.</p>
          <a className="btn primary" href={connectUrl}>
            Connect Upstox
          </a>
        </div>
      )}
      <p className="fineprint">
        OAuth redirect must match your Upstox app settings. Redirect URI:{' '}
        <code>http://localhost:4000/api/auth/upstox/callback</code>
      </p>
    </section>
  )
}
