export function FavStar({
  active,
  onToggle,
  size = 'sm',
}: {
  active: boolean
  onToggle: () => void
  size?: 'sm' | 'md'
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      title={active ? 'Favorited' : 'Add to favorites'}
      className={`transition hover:scale-110 ${size === 'md' ? 'text-xl' : 'text-base'} ${
        active ? 'text-accent drop-shadow-[0_0_6px_var(--color-accent)]' : 'text-muted hover:text-accent'
      }`}
    >
      {active ? '★' : '☆'}
    </button>
  )
}
