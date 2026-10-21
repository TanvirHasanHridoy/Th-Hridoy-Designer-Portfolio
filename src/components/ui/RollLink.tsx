import { forwardRef, type AnchorHTMLAttributes } from 'react'

interface RollLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  label: string
}

/**
 * Text-roll link — the label slides up and its duplicate rolls in from
 * below, the classic Lusion-style hover micro-interaction (pure CSS).
 */
const RollLink = forwardRef<HTMLAnchorElement, RollLinkProps>(function RollLink(
  { label, className = '', children, ...rest },
  ref,
) {
  return (
    <a ref={ref} className={`roll ${className}`} {...rest}>
      <span className="roll-stack">
        <span>{label}</span>
        <span aria-hidden>{label}</span>
      </span>
      {children}
    </a>
  )
})

export default RollLink
