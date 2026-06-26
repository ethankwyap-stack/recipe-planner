import { useState } from 'react'
import type { Recipe } from '../types'
import {
  clearRepoConfig,
  commitRecipes,
  guessRepoFromUrl,
  isConfigured,
  loadRepoConfig,
  saveRepoConfig,
  type RepoConfig,
} from '../lib/github'
import { clearDraft, exportRecipesFile, hasDraft } from '../lib/storage'
import { Button, Field, Modal, inputClass } from './ui'

const blank: RepoConfig = {
  owner: '',
  repo: '',
  branch: 'main',
  path: 'public/data/recipes.json',
  token: '',
  autoPublish: true,
}

export function SettingsModal({
  open,
  onClose,
  recipes,
  onCommitted,
}: {
  open: boolean
  onClose: () => void
  recipes: Recipe[]
  onCommitted: () => void
}) {
  const [cfg, setCfg] = useState<RepoConfig>(() => loadRepoConfig() ?? { ...blank, ...guessRepoFromUrl() })
  const [status, setStatus] = useState<{ kind: 'idle' | 'busy' | 'ok' | 'err'; msg?: string }>({
    kind: 'idle',
  })

  const set = (patch: Partial<RepoConfig>) => setCfg((c) => ({ ...c, ...patch }))

  const save = () => {
    saveRepoConfig(cfg)
    setStatus({ kind: 'ok', msg: 'Saved in this browser.' })
  }

  const publish = async () => {
    setStatus({ kind: 'busy' })
    try {
      saveRepoConfig(cfg)
      await commitRecipes(cfg, recipes)
      clearDraft()
      onCommitted()
      setStatus({ kind: 'ok', msg: 'Published! Your site will redeploy in ~1 minute.' })
    } catch (e) {
      setStatus({ kind: 'err', msg: e instanceof Error ? e.message : 'Commit failed.' })
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Publish & sharing settings" wide>
      <p className="text-sm text-muted">
        Your recipes live inside the website in <code className="text-neon">recipes.json</code>.
        Set this up <strong>once</strong> and every change you make publishes itself automatically —
        no buttons to press. It's free; the token stays only in this browser.
      </p>

      <div className="mt-4 rounded-xl border border-neon/30 bg-neon/5 p-4">
        <h4 className="text-sm font-semibold text-text">⚡ Auto-publish (one-time setup)</h4>
        <p className="mt-1 mb-3 text-sm text-muted">
          Paste a GitHub{' '}
          <a
            className="text-neon hover:underline"
            href="https://github.com/settings/tokens?type=beta"
            target="_blank"
            rel="noreferrer"
          >
            fine-grained token
          </a>{' '}
          with <em>Contents: Read &amp; write</em> on this repo. Owner &amp; repo are pre-filled from
          your site URL — usually you only need to paste the token.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Owner (username)">
            <input className={inputClass} value={cfg.owner} onChange={(e) => set({ owner: e.target.value })} />
          </Field>
          <Field label="Repo name">
            <input className={inputClass} value={cfg.repo} onChange={(e) => set({ repo: e.target.value })} />
          </Field>
          <Field label="Branch">
            <input className={inputClass} value={cfg.branch} onChange={(e) => set({ branch: e.target.value })} />
          </Field>
          <Field label="File path">
            <input className={inputClass} value={cfg.path} onChange={(e) => set({ path: e.target.value })} />
          </Field>
        </div>
        <Field label="Access token">
          <input
            type="password"
            className={`${inputClass} mt-3`}
            value={cfg.token}
            placeholder="github_pat_…"
            onChange={(e) => set({ token: e.target.value })}
          />
        </Field>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cfg.autoPublish !== false}
            onChange={(e) => set({ autoPublish: e.target.checked })}
            className="accent-[var(--color-neon)]"
          />
          <span>
            Publish changes automatically{' '}
            <span className="text-muted">— recommended; turn off to publish manually</span>
          </span>
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={save}>
            Save token
          </Button>
          <Button variant="primary" disabled={!isConfigured(cfg) || status.kind === 'busy'} onClick={publish}>
            {status.kind === 'busy' ? 'Publishing…' : '🚀 Save & publish now'}
          </Button>
          {loadRepoConfig() && (
            <Button
              variant="danger"
              onClick={() => {
                clearRepoConfig()
                setCfg(blank)
                setStatus({ kind: 'ok', msg: 'Token removed from this browser.' })
              }}
            >
              Forget token
            </Button>
          )}
        </div>
        {hasDraft() && (
          <p className="mt-2 text-xs text-accent">
            You have unpublished changes saved locally — publish or export to make them part of the
            site.
          </p>
        )}
        {status.msg && (
          <p
            className={`mt-2 text-sm ${
              status.kind === 'err' ? 'text-red-300' : 'text-neon'
            }`}
          >
            {status.msg}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
        <h4 className="text-sm font-semibold text-text">No token? Export &amp; commit manually</h4>
        <p className="mt-1 text-sm text-muted">
          Download the file, replace <code>public/data/recipes.json</code> in your repo and push.
          Fully free, no token.
        </p>
        <Button variant="ghost" className="mt-2" onClick={() => exportRecipesFile(recipes)}>
          ⬇ Export recipes.json
        </Button>
      </div>
    </Modal>
  )
}
