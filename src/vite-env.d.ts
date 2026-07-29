/// <reference types="vite/client" />

/**
 * Declaration merging onto Vite's own ImportMetaEnv, so the variables this app
 * actually reads are typed rather than falling through the `any` index
 * signature. A typo in a variable name then fails typecheck instead of
 * silently becoming undefined at runtime.
 */
interface ImportMetaEnv {
  /** Backend origin. Empty means the supported local-only mode. */
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_TIMEOUT_MS?: string
  /** Absolute site origin, used for canonical, sitemap and og:url. */
  readonly VITE_SITE_URL?: string
  /** 'true' on preview deploys, to keep them out of the index. */
  readonly VITE_NOINDEX?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * vite.config.ts runs in Node and reads VITE_BASE from the CI environment.
 * Declared narrowly here rather than pulling in all of @types/node for one
 * property; remove this block if @types/node is ever added as a dependency.
 */
declare const process: {
  readonly env: Record<string, string | undefined>
  cwd(): string
}
