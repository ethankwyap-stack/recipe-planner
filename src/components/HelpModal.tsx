import type { ReactNode } from 'react'
import { Button, Modal } from './ui'

function Section({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-neon">
        <span className="text-base">{icon}</span>
        {title}
      </h3>
      <div className="mt-2 space-y-1.5 text-sm text-muted">{children}</div>
    </div>
  )
}

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="👋 How to use Mise" wide>
      <p className="text-sm text-muted">
        Mise is your personal recipe box and weekly meal planner. Here's the quick tour — you can
        reopen this anytime from the <strong className="text-text">Help</strong> button.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Section icon="📖" title="1. Build your recipe box">
          <p>
            Go to the <strong className="text-text">Recipes</strong> tab. Add recipes three ways:
          </p>
          <p>
            • <strong className="text-text">+ New recipe</strong> — type it in.
          </p>
          <p>
            • <strong className="text-text">⬆ Import</strong> — paste several at once, or a{' '}
            <code>recipes.json</code> file.
          </p>
          <p>
            • <strong className="text-text">📷 From photo</strong> — snap a recipe card or cookbook
            page on your phone; it reads the text for you to tidy up. (Works great on the live site
            from your phone.)
          </p>
        </Section>

        <Section icon="🗓" title="2. Plan your week">
          <p>
            On the <strong className="text-text">Planner</strong> tab, set how many people you're
            cooking for, then hit <strong className="text-text">✨ Auto-fill week</strong> to fill
            every lunch &amp; dinner from your recipes — no repeats.
          </p>
          <p>
            Use the diet tags (e.g. <em>vegetarian</em>) to restrict the auto-fill. Hover any meal
            to <strong className="text-text">↻ reroll</strong> or clear it, or click a slot to pick
            one yourself.
          </p>
        </Section>

        <Section icon="🛒" title="3. Grab the grocery list">
          <p>
            Scroll below the planner — your shopping list builds itself: every ingredient combined,
            scaled to your serving count, grouped by aisle. Tick things off, or{' '}
            <strong className="text-text">🖨 Print</strong> it.
          </p>
        </Section>

        <Section icon="🧑‍🍳" title="4. Cook from what you have">
          <p>
            The <strong className="text-text">Cook</strong> tab: type the ingredients you've got and
            it finds recipes you can make right now (or with just a couple of extras). Salt, pepper,
            oil &amp; butter are assumed.
          </p>
        </Section>

        <Section icon="⭐" title="5. Mark favorites">
          <p>
            Tap the <span className="text-accent">★</span> on any recipe to favorite it. Filter to
            just favorites in the Recipes tab, and the planner will lean toward them when
            auto-filling.
          </p>
        </Section>

        <Section icon="🔗" title="6. Share a plan">
          <p>
            Hit <strong className="text-text">🔗 Share</strong> on the planner to copy a link. Anyone
            can open it — no login — to see the plan, recipes and grocery list. They can{' '}
            <strong className="text-text">Save a copy</strong> to tweak their own version.
          </p>
        </Section>
      </div>

      <div className="mt-3 rounded-xl border border-neon/30 bg-neon/5 p-4 text-sm text-muted">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neon">
          <span className="text-base">⚡</span> Your recipes live in the site
        </h3>
        <p className="mt-2">
          Recipes you add are saved instantly and — once auto-publish is set up — pushed to the live
          website so everyone on every device sees the same collection. You'll see{' '}
          <span className="text-neon">✓ Published — live</span> in the top corner when it syncs. No
          buttons to press.
        </p>
      </div>

      <div className="mt-4 flex justify-end border-t border-border pt-4">
        <Button variant="primary" onClick={onClose}>
          Got it — let's cook 🍳
        </Button>
      </div>
    </Modal>
  )
}
