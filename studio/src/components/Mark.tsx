/** OpenLineage brand mark — served from /public. */
export function Mark({ className }: { className?: string }) {
  return (
    <img
      src="/openlineage.png"
      alt="OpenLineage"
      className={className}
      draggable={false}
    />
  )
}

/** Small Atlan "A" mark used for the subtle "by Atlan" badge. */
export function AtlanMark({ className }: { className?: string }) {
  return (
    <img
      src="/atlan-a.png"
      alt="Atlan"
      className={className}
      draggable={false}
    />
  )
}
