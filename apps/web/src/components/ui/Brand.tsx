interface BrandProps {
  size?: 'sm' | 'md' | 'lg'
}

export function Brand({ size = 'md' }: BrandProps) {
  return (
    <span className={`brand brand--${size}`} role="img" aria-label="Redak eSport">
      <img className="brand__mark" src="/brand-mark.svg" alt="" width="32" height="32" />
      <span className="brand__wordmark" aria-hidden="true">
        <span className="brand__red">Redak</span>
        {'\u00a0'}
        <span className="brand__e">e</span>
        <span className="brand__red">Sport</span>
      </span>
    </span>
  )
}
