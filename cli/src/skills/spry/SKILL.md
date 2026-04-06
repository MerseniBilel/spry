---
name: spry
description: Use when the developer asks to create a new feature, scaffold a feature, generate code from a repository contract, or mentions Spry. Also use when working with Clean Architecture patterns in React Native/Expo projects.
argument-hint: "[feature-name]"
---

You are helping a developer who uses **Spry** — a CLI tool that scaffolds production-ready React Native (Expo) apps with Clean Architecture.

## How Spry Works

The developer defines an abstract repository class with `@spry-cli/decorators`, and Spry generates the full implementation: use cases, data layer, React Query hooks, Zustand store, DI wiring.

### Flow

```
spry init          → creates Expo project + config
spry new <feature> → creates domain skeleton
  (developer writes contract + models)
spry build <feature> → generates all implementation files
spry format        → runs Prettier on feature files
```

## When the user asks to create a new feature

Follow these steps exactly:

### Step 1: Run `spry new $ARGUMENTS`

```bash
spry new $ARGUMENTS
```

### Step 2: Create the domain models

Create model interfaces in `src/features/$ARGUMENTS/domain/models/`. Ask the user what fields the models need, or infer from context. Each type gets its own file:

```ts
// src/features/$ARGUMENTS/domain/models/EntityName.ts
export interface EntityName {
  id: number
  // fields...
}
```

### Step 3: Write the repository contract

Update `src/features/$ARGUMENTS/domain/repositories/` with the abstract class. Use decorators:

```ts
import { GET, POST, PUT, DELETE, Param, Query, Body, BaseURL, Cache } from '@spry-cli/decorators'
import type { EntityName } from '../models/EntityName'

@BaseURL('/api-path')
export abstract class FeatureRepository {
  @GET('/')
  @Cache(60)
  getAll(): Promise<EntityName[]> { throw new Error('contract') }

  @GET('/:id')
  getById(@Param('id') id: number): Promise<EntityName> { throw new Error('contract') }

  @POST('/')
  create(@Body() input: CreateInput): Promise<EntityName> { throw new Error('contract') }
}
```

### Step 4: Build

```bash
spry build $ARGUMENTS
```

### Step 5: Format

```bash
spry format
```

## Decorator Reference

| Decorator | Usage |
|-----------|-------|
| `@BaseURL(path)` | Base path prefix for all methods |
| `@GET(path)` | GET request |
| `@POST(path)` | POST request |
| `@PATCH(path)` | PATCH request |
| `@PUT(path)` | PUT request |
| `@DELETE(path)` | DELETE request |
| `@Cache(seconds)` | Sets staleTime in React Query |
| `@Paginated()` | Generates useInfiniteQuery |
| `@Param(name)` | Path parameter (:name in URL) |
| `@Query(name)` | Query string parameter |
| `@Body()` | Request body |
| `@Header(name)` | Request header |

## Rules

- Types MUST be defined in `domain/models/` — one file per type, exported as interface
- The repository contract MUST import types from `../models/`
- The repository file MUST have `// @ts-nocheck` at the top
- `@BaseURL` should be the API path prefix — the base domain comes from `EXPO_PUBLIC_API_URL` in `.env`
- After `spry build`, always run `spry format` to normalize code style
- When adding methods to an existing feature, just edit the repository and run `spry build` again — it detects new methods and injects them
- Never edit Spry-owned files (use cases, repoImpl, dataSource, queries, di.ts) — they get regenerated
- Developer-owned files (store, screen, models) are generated once and never overwritten

## Generated File Structure

```
features/<name>/
  domain/
    repositories/<Name>Repository.ts    ← developer writes this
    models/<Type>.ts                    ← developer writes these
    usecases/<Method>UseCase.ts         ← generated per method
    usecases/index.ts                   ← barrel export
  data/
    repositories/<Name>RepositoryImpl.ts ← generated
    datasources/<Name>RemoteDataSource.ts ← generated
    models/                             ← for DTOs (future)
  presentation/
    hooks/<name>Queries.ts              ← React Query hooks
    hooks/index.ts                      ← barrel export
    state/<name>Store.ts                ← Zustand (developer-owned)
    views/<Name>Screen.tsx              ← starter component (developer-owned)
    components/                         ← developer adds UI here
  di.ts                                 ← DI wiring
```
