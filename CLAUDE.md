# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spry is an open-source CLI tool that scaffolds production-ready React Native (Expo) mobile apps using Clean Architecture / DDD. Developers define a typed contract (abstract repository class with TypeScript decorators), and Spry generates all boilerplate — data layer, use cases, state management, DI wiring.

- **npm package:** `spry` (CLI), `@spry-cli/decorators` (companion decorators package)
- **Target:** React Native (Expo) — mobile-only, no web/RSC
- **CLI written in TypeScript**

## Monorepo Structure

```
spry/
├── packages/decorators/     ← @spry-cli/decorators npm package
├── cli/                     ← spry CLI (main package)
├── example/                 ← Expo app for integration tests + showcase
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
```

- **Test runner:** Vitest
- **Linting:** ESLint + Prettier

## Architecture — How Spry Works

### CLI Commands

1. **`spry init`** — scaffolds project config, installs deps, writes `.spryrc.json`, `.spry-manifest.json`, `.env`, `.prettierrc`
2. **`spry new <feature>`** — creates domain skeleton (abstract repo class, model placeholder, empty dirs)
3. **`spry build <feature|all>`** — parses abstract repo via ts-morph, generates all implementation files. Flags: `--dry-run`, `--force`
4. **`spry format`** — runs Prettier on all feature files
5. **`spry skill`** — installs Claude Code skill in `.claude/skills/spry/`

### Parsing Pipeline

ts-morph with TypeScript Type Checker (not just AST):
- **Decorators** read from AST nodes (no runtime execution)
- **Types** resolved via Type Checker (`getType()`) — follows imports, expands generics, detects nullability
- Output: normalized JSON with pre-split `queries`, `paginatedQueries`, `mutations` arrays (Mustache never needs if/else)

### Code Generation

- **Mustache** (logic-less) templates — one template per tech choice, no conditionals inside templates
- Template selection driven by `.spryrc.json` config choices
- Templates live in `cli/src/templates/`

### Injection (Adding Methods to Existing Files)

When a developer adds methods to the abstract class and reruns `spry build`, Spry injects into existing files using **ts-morph write API** — pure AST operations, no regex/string manipulation.

**File ownership model:**
- **Spry-owned** (safe to generate/inject): use cases, RepositoryImpl, RemoteDataSource, queries, di.ts, DTOs, mappers, barrel indexes
- **Developer-owned** (generated once, never touched): `<feature>Store.ts`, domain models, abstract repository

### Manifest & Config Integrity

- `.spry-manifest.json` tracks generated methods per feature — diffs against abstract class to find new methods
- `.spryrc.json` checksum validated on every build — hard stop if tampered

## CLI Internal Architecture (`cli/src/`)

| Directory | Responsibility |
|-----------|---------------|
| `commands/` | Commander.js command handlers (init, new, build) |
| `parser/` | RepositoryParser, MethodParser, TypeResolver, DecoratorReader, NormalizationMapper |
| `generator/` | FileGenerator, FeatureGenerator, TemplateSelector |
| `injector/` | MethodInjector, FunctionInjector, ExportInjector, ImportInjector (all ts-morph) |
| `manifest/` | ManifestReader, ManifestWriter, ManifestValidator |
| `config/` | ConfigReader, ConfigWriter, ConfigIntegrityChecker |
| `installer/` | PackageInstaller (detects npm/yarn/pnpm) |
| `prompts/` | Clack prompt flows |
| `templates/` | All .mustache files |
| `utils/` | logger (Clack), fs helpers, string transforms (pascalCase, camelCase, kebabCase) |

## Generated Feature Structure (what Spry outputs)

```
features/<featureName>/
  presentation/  (views, components, hooks, state/)
  domain/        (usecases, repositories, models, errors)
  data/          (repositories, datasources, models)
  di.ts          (dependency wiring)
```

Layer rules: Domain has zero external imports. Data absorbs HTTP differences. Presentation absorbs state management differences. DTO-to-Domain mapping happens in data/repositories.

## Tech Stack (CLI)

Commander.js (CLI), Clack (prompts), Mustache (templates), ts-morph (TS read+write), Vitest (tests), ESLint+Prettier (lint), pnpm workspaces (monorepo)

## Testing Strategy

- **Unit tests** (`cli/tests/unit/`) — mirror `src/` structure 1:1, mock external deps
- **Integration tests** (`cli/tests/integration/`) — full CLI commands in temp directories, no mocking (real fs, real ts-morph, real Mustache)
- **Fixtures** (`cli/tests/fixtures/`) — sample repository files, config files, expected output directories for snapshot diffing

## `@spry-cli/decorators` API

Method decorators: `@GET`, `@POST`, `@PATCH`, `@PUT`, `@DELETE` (path), `@Cache(seconds)`, `@Paginated()`
Parameter decorators: `@Param(name)`, `@Query(name)`, `@Body()`, `@Header(name)`
Class decorator: `@BaseURL(url)`

These are read statically via ts-morph AST — no runtime execution by the CLI.

## Error Handling Pattern (Generated Code)

`DomainError` -> `HttpError` (status-aware) + `NetworkError`. The generated `httpClient.ts` normalizes fetch (doesn't throw on 4xx/5xx) and axios (auto-throws) into the same HttpError/NetworkError types. React Query hooks use typed errors: `useQuery<T, DomainError>`.

## Key Constraints

- Never use "With" keyword in type names (e.g., never `BusinessWithRelations`) — use composition or other naming
- Phase 1 MVP: REST + fetch/axios + React Query + Zustand only
- DI pattern: simple singleton `di.ts` per feature — no DI container (no tsyringe, no inversify)
- Cache invalidation is developer's responsibility — Spry generates empty `onSuccess` with guiding comments
