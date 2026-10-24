import type { Recipe } from '../types'
import { exportRecipesFile } from '../lib/storage'

export function BackupReminder({ recipes, onDismiss }: { recipes: Recipe[]; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg text-sm no-print">
      <span className="text-muted">
        Safari clears browser data after 7 days — download a backup to keep your recipes safe.
      </span>
      <button
        onClick={() => exportRecipesFile(recipes)}
        className="rounded-lg bg-neon/15 px-3 py-1 text-neon hover:bg-neon/25 transition"
      >
        Download backup
      </button>
      <button
        onClick={onDismiss}
        className="text-muted hover:text-text transition"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
