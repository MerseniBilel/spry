# Plan: `spry init` Command

> Implementation plan for the `spry init` command — Phase 1 MVP scope only.
> REST + fetch/axios + React Query + Zustand.

---

## Current State

All init-related files exist but are empty stubs:
- `cli/src/commands/init.ts` — placeholder with TODO
- `cli/src/prompts/initPrompts.ts` — empty TODO
- `cli/src/config/ConfigWriter.ts` — empty class
- `cli/src/config/ConfigReader.ts` — empty class
- `cli/src/config/ConfigIntegrityChecker.ts` — empty class
- `cli/src/installer/PackageInstaller.ts` — empty class

Utilities already implemented: `logger.ts`, `fs.ts` (ensureDir, writeFileWithDir, readFileContent, fileExists), `string.ts` (pascalCase, camelCase, kebabCase).

---

## 1. Types & Interfaces

- [x] Create `cli/src/types/config.ts` — define `SpryConfig` interface:
  ```ts
  interface SpryConfig {
    stateManagement: 'zustand'           // Phase 1 only
    networkLayer: 'fetch' | 'axios'
    queryClient: 'react-query'           // Phase 1 only
    apiRoutes: boolean
    checksum: string
  }
  ```
- [x] Create `cli/src/types/manifest.ts` — define `SpryManifest` interface:
  ```ts
  interface SpryManifest {
    features: Record<string, { generatedMethods: string[] }>
  }
  ```

---

## 2. Prompts — `initPrompts.ts`

- [x] Implement Clack prompt flow with the following prompts:
  - [x] State management: Zustand (only option in Phase 1, show as selected/default)
  - [x] Network layer: `fetch` (default) or `axios`
  - [x] Query client: React Query (only option in Phase 1, show as selected/default)
  - [x] API Routes: Yes / No (enables Expo Router `+api.ts` endpoints)
- [x] Return a typed result object matching `SpryConfig` (minus checksum)
- [x] Handle user cancellation (Clack `isCancel`) — exit gracefully
---

## 3. Config — `ConfigWriter.ts`

- [x] Implement `write(projectRoot: string, config: SpryConfig): Promise<void>`
  - Writes `.spryrc.json` to project root with all config fields + computed checksum
- [x] Implement checksum computation:
  - SHA-256 hash of the JSON-stringified config fields (excluding the checksum field itself)
  - Store as hex string in the `checksum` field

---

## 4. Config — `ConfigReader.ts`

- [x] Implement `read(projectRoot: string): Promise<SpryConfig | null>`
  - Reads and parses `.spryrc.json`, returns null if not found
- [x] Implement `exists(projectRoot: string): Promise<boolean>`

---

## 5. Config — `ConfigIntegrityChecker.ts`

- [x] Implement `verify(projectRoot: string): Promise<boolean>`
  - Reads `.spryrc.json`, recomputes checksum, compares to stored value
  - Returns `true` if valid, `false` if tampered
- [x] Reuse the same checksum logic from `ConfigWriter`
- [x] Extract shared checksum function to a utility (e.g., `computeConfigChecksum(config)`)

---

## 6. Package Installer — `PackageInstaller.ts`

- [x] Implement package manager detection:
  - Check for `bun.lockb` or `bun.lock` -> bun
  - Check for `pnpm-lock.yaml` -> pnpm
  - Check for `yarn.lock` -> yarn
  - Check for `package-lock.json` -> npm
  - Fallback: npm
- [x] Implement `install(projectRoot: string, packages: string[], isDev: boolean): Promise<void>`
  - Runs the correct install command via `child_process.execSync` or `execa`
  - Shows Clack spinner during installation
- [x] Define dependency lists based on config choices:
  - **Always:** `@spry/decorators`
  - **React Query:** `@tanstack/react-query`
  - **Zustand:** `zustand`
  - **Axios (if selected):** `axios`

---

## 7. Shared Scaffold Generation

- [x] Generate `shared/errors/DomainError.ts`:
  ```ts
  class DomainError extends Error {
    constructor(public readonly code: string, message: string)
  }
  ```
- [x] Generate `shared/errors/HttpError.ts`:
  ```ts
  class HttpError extends DomainError {
    constructor(public readonly status: number, message: string)
    get isNotFound()
    get isUnauthorized()
    get isServerError()
  }
  ```
- [x] Generate `shared/errors/NetworkError.ts`
- [x] Generate `shared/errors/index.ts` barrel export
- [x] Generate `shared/http/httpClient.ts`:
  - **fetch variant:** wraps fetch, checks `response.ok`, throws `HttpError` on 4xx/5xx, throws `NetworkError` on network failure
  - **axios variant:** wraps axios, catches axios errors, normalizes into `HttpError` / `NetworkError`
  - Template selection based on `networkLayer` config choice
- [x] Generate empty scaffold directories with `.gitkeep`:
  - `shared/components/`
  - `shared/hooks/`
  - `shared/utils/`
  - `shared/constants/`
  - `shared/types/`

---

## 8. Mustache Templates for Shared Scaffold

- [x] Create `cli/src/templates/shared/errors.base.mustache` (DomainError)
- [x] Create `cli/src/templates/shared/errors.http.mustache` (HttpError)
- [x] Create `cli/src/templates/shared/errors.network.mustache` (NetworkError)
- [x] Create `cli/src/templates/shared/errors.index.mustache` (barrel)
- [x] Create `cli/src/templates/shared/http.fetch.mustache` (fetch httpClient)
- [x] Create `cli/src/templates/shared/http.axios.mustache` (axios httpClient)

---

## 9. tsconfig.json Patching

- [x] Implement `patchTsConfig(projectRoot: string): Promise<void>`:
  - Read existing `tsconfig.json`
  - Add `"experimentalDecorators": true` to `compilerOptions`
  - Add `"emitDecoratorMetadata": true` to `compilerOptions`
  - Preserve all existing config (JSON parse, modify, write back)
  - Handle missing `compilerOptions` key gracefully
  - Warn if `tsconfig.json` not found (don't fail — user may create it later)

---

## 10. Manifest — Initial Empty Manifest

- [x] Implement `ManifestWriter.write(projectRoot: string, manifest: SpryManifest): Promise<void>`
  - Writes `.spry-manifest.json`
- [x] On init, write empty manifest: `{ "features": {} }`

---

## 11. Init Command Orchestration — `commands/init.ts`

- [x] Wire the full init flow in order:
  1. `logger.intro('spry init')` — show welcome banner
  2. Check if `.spryrc.json` already exists — if yes, warn and ask to confirm overwrite
  3. Run `initPrompts()` — collect user choices
  4. Compute checksum and build full `SpryConfig`
  5. `ConfigWriter.write()` — write `.spryrc.json`
  6. `ManifestWriter.write()` — write empty `.spry-manifest.json`
  7. Patch `tsconfig.json` — add decorator support
  8. Generate shared scaffold (errors, http, empty dirs)
  9. `PackageInstaller.install()` — install dependencies
  10. `logger.outro()` — show success + next steps
- [x] Handle errors at each step with clear messages
- [x] Support `--yes` / `-y` flag for non-interactive mode (uses defaults: fetch, no API routes)

---

## Dependency Graph (Implementation Order)

```
1. Types (config, manifest)
2. Checksum utility
3. ConfigWriter + ConfigReader + ConfigIntegrityChecker  (parallel)
4. PackageInstaller
5. Mustache templates for shared scaffold
6. tsconfig patcher
7. ManifestWriter (minimal)
8. initPrompts
9. init command orchestration (wires everything)
```

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `cli/src/types/config.ts` |
| Create | `cli/src/types/manifest.ts` |
| Modify | `cli/src/prompts/initPrompts.ts` |
| Modify | `cli/src/config/ConfigWriter.ts` |
| Modify | `cli/src/config/ConfigReader.ts` |
| Modify | `cli/src/config/ConfigIntegrityChecker.ts` |
| Modify | `cli/src/installer/PackageInstaller.ts` |
| Modify | `cli/src/manifest/ManifestWriter.ts` |
| Modify | `cli/src/commands/init.ts` |
| Create | `cli/src/templates/shared/errors.base.mustache` |
| Create | `cli/src/templates/shared/errors.http.mustache` |
| Create | `cli/src/templates/shared/errors.network.mustache` |
| Create | `cli/src/templates/shared/errors.index.mustache` |
| Create | `cli/src/templates/shared/http.fetch.mustache` |
| Create | `cli/src/templates/shared/http.axios.mustache` |
