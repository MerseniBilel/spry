# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spry is an open-source CLI tool that scaffolds production-ready React Native (Expo) mobile apps using Clean Architecture / DDD. Developers define a typed contract (abstract repository class with TypeScript decorators), and Spry generates all boilerplate — data layer, use cases, state management, DI wiring.

- **npm package:** `@spry-cli/spry` (CLI), `@spry-cli/decorators` (companion decorators package)
- **Target:** React Native (Expo) — mobile-only, no web/RSC
- **CLI written in TypeScript**

## Monorepo Structure

```
spry/
├── packages/decorators/     ← @spry-cli/decorators npm package
├── cli/                     ← spry CLI (main package)
├── docs/
└── .github/workflows/       ← CI + release
```

**Package manager:** pnpm workspaces

## Build / Dev / Test Commands

```bash
pnpm install                          # install all workspace deps
pnpm --filter spry build              # build CLI
pnpm --filter @spry-cli/decorators build  # build decorators package
pnpm --filter spry test               # run all CLI tests
pnpm --filter spry test -- --run <path>  # run a single test file
pnpm lint                             # lint all packages
```

- **Test runner:** Vitest
- **Linting:** ESLint + Prettier
- **Always run `pnpm lint` and `pnpm test` before pushing or tagging releases**

## Architecture — How Spry Works

### CLI Commands

1. **`spry init`** — scaffolds Expo project, installs deps, writes `.spryrc.json`, `.spry-manifest.json`, `.env`, `.prettierrc`, patches tsconfig + ESLint
2. **`spry new <feature>`** — creates domain skeleton (abstract repo class, empty model file, empty dirs)
3. **`spry build <feature|all>`** — parses abstract repo via ts-morph, generates all implementation files. Flags: `--dry-run`, `--force`
4. **`spry format`** — runs Prettier on all feature files
5. **`spry skill`** — installs Claude Code skill in `.claude/skills/spry/`

### Repository Contract — BUILD-TIME ONLY

The abstract repository class with decorators is a **build-time only contract**. Spry CLI reads it via ts-morph during `spry build`. It is **never imported or executed at runtime** because Metro's hermes-parser does not support `@` decorator syntax (https://github.com/facebook/hermes/issues/1549).

Contract methods use **concrete stubs** (`throw new Error('contract')`), not the `abstract` keyword, because Babel's legacy decorator transform crashes on decorated abstract methods.

The generated `RepositoryImpl` is a **standalone class** — it does NOT extend the abstract repository. Use cases reference the abstract repository via `import type` only (erased at compile time).

### Parsing Pipeline

ts-morph with TypeScript Type Checker (not just AST):
- **Decorators** read from AST nodes (no runtime execution)
- **Types** resolved via Type Checker (`getType()`) — follows imports, expands generics, detects nullability
- **Method filtering** by presence of Spry decorators (@GET, @POST, etc.) — not by `abstract` keyword
- **Import resolution** via TypeSourceMapper — reads import declarations from contract file, builds type-to-alias-path map
- Output: normalized JSON with pre-split `queries`, `paginatedQueries`, `mutations` arrays (Mustache never needs if/else)

### Code Generation

- **Mustache** (logic-less) templates — one template per tech choice, no conditionals inside templates
- Template selection driven by `.spryrc.json` config choices
- Templates live in `cli/src/templates/`
- **No model files generated** — developer owns all domain models. Spry reads import paths from the contract and uses them in generated code.
- Type imports are **grouped by source path** (developer can put all types in one file or split across multiple files)

### Injection (Adding Methods to Existing Files)

When a developer adds methods to the contract and reruns `spry build`, Spry injects into existing files using **ts-morph write API** — pure AST operations, no regex/string manipulation.

**File ownership model:**
- **Spry-owned** (safe to generate/inject): use cases, RepositoryImpl, RemoteDataSource, queries hooks, di.ts, barrel indexes
- **Developer-owned** (generated once, never touched): `<feature>Store.ts`, all domain models, abstract repository, screen views

### Manifest & Config Integrity

- `.spry-manifest.json` tracks generated methods per feature — diffs against contract to find new methods
- `.spryrc.json` checksum validated on every build — hard stop if tampered

## CLI Internal Architecture (`cli/src/`)

| Directory | Responsibility |
|-----------|---------------|
| `commands/` | Commander.js command handlers (init, new, build, format, skill) |
| `parser/` | RepositoryParser, MethodParser, TypeResolver, DecoratorReader, NormalizationMapper, TypeSourceMapper |
| `generator/` | FileGenerator, FeatureGenerator, BuildGenerator, ScaffoldGenerator, TemplateSelector |
| `injector/` | MethodInjector, ExportInjector, ImportInjector (all ts-morph) |
| `manifest/` | ManifestReader, ManifestWriter, ManifestValidator |
| `config/` | ConfigReader, ConfigWriter, ConfigIntegrityChecker |
| `installer/` | PackageInstaller (detects npm/yarn/pnpm/bun) |
| `prompts/` | Clack prompt flows |
| `templates/` | All .mustache files |
| `utils/` | logger (Clack), fs helpers, string transforms, checksum, tsconfig, eslint, format |

## Generated Feature Structure (what Spry outputs)

```
features/<featureName>/
  presentation/  (views, components, hooks, state/)
  domain/        (usecases, repositories, models)
  data/          (repositories, datasources)
  di.ts          (dependency wiring)
```

Layer rules: Domain has zero external imports. Data absorbs HTTP differences. Presentation absorbs state management differences.

## Tech Stack (CLI)

Commander.js (CLI), Clack (prompts), Mustache (templates), ts-morph (TS read+write), Vitest (tests), ESLint+Prettier (lint), pnpm workspaces (monorepo)

## Testing Strategy

- **Unit tests** (`cli/tests/unit/`) — mirror `src/` structure 1:1, mock external deps
- **Integration tests** (`cli/tests/integration/`) — full CLI commands in temp directories, no mocking (real fs, real ts-morph, real Mustache)
- **Fixtures** (`cli/tests/fixtures/`) — sample repository files with concrete stub methods

## `@spry-cli/decorators` API

Method decorators: `@GET`, `@POST`, `@PATCH`, `@PUT`, `@DELETE` (path), `@Cache(seconds)`, `@Paginated()`
Parameter decorators: `@Param(name)`, `@Query(name)`, `@Body()`, `@Header(name)`
Class decorator: `@BaseURL(url)`

These are no-op functions at runtime. Read statically via ts-morph AST by the CLI.

## Error Handling Pattern (Generated Code)

`DomainError` -> `HttpError` (status-aware) + `NetworkError`. The generated `httpClient.ts` normalizes fetch and axios into the same error types. Uses `extractErrorMessage()` for generic error body parsing. React Query hooks use typed errors: `useQuery<T, DomainError>`.

## HTTP Client Features (Generated Code)

- **Interceptors** — request/response interceptor system (both fetch and axios)
- **Dev logger** — logs request/response in `__DEV__` mode, stripped in production
- **Auth** — `setAuthToken(token)` export, automatically attaches `Authorization: Bearer` header
- **Error extraction** — handles `{ message }`, `{ error }`, string, JSON fallback

## Key Constraints

- Never use "With" keyword in type names (e.g., never `BusinessWithRelations`) — use composition or other naming
- Phase 1 MVP: REST + fetch/axios + React Query + Zustand only
- DI pattern: simple singleton `di.ts` per feature — no DI container (no tsyringe, no inversify)
- Mutations auto-invalidate feature queries: `queryClient.invalidateQueries({ queryKey: ['featureName'] })`
- Pagination hooks use `useInfiniteQuery` without explicit generics — `pageParam` type inferred from `initialPageParam`
- `emitDecoratorMetadata` is NOT set — Babel/Metro ignores it
- tsconfig patch preserves existing path aliases (e.g., Expo's `@/*`)
