# @spry-cli/spry

A CLI that scaffolds production-ready React Native (Expo) apps with Clean Architecture.

**Define once, generate everything.** Write an abstract repository class with decorators, and Spry generates the entire implementation stack: data layer, use cases, React Query hooks, Zustand store, and DI wiring.

## Install

```bash
npx @spry-cli/spry init
```

## Usage

### 1. Initialize a project

```bash
spry init
```

Creates an Expo project with all dependencies installed, tsconfig patched, shared error handling and HTTP client scaffolded.

### 2. Create a feature

```bash
spry new contact
```

Generates the domain skeleton with an abstract repository class and model placeholder.

### 3. Define your contract

```ts
import { GET, POST, PUT, DELETE, Param, Body, BaseURL, Cache } from '@spry-cli/decorators'
import type { Contact } from '../models/Contact'
import type { CreateContactInput } from '../models/CreateContactInput'

@BaseURL('/users')
export abstract class ContactRepository {

  @GET('/')
  @Cache(60)
  abstract getContacts(): Promise<Contact[]>

  @GET('/:id')
  abstract getContact(@Param('id') id: number): Promise<Contact>

  @POST('/')
  abstract createContact(@Body() input: CreateContactInput): Promise<Contact>

  @DELETE('/:id')
  abstract deleteContact(@Param('id') id: number): Promise<void>
}
```

### 4. Generate everything

```bash
spry build contact
```

Generates:

```
features/contact/
  domain/usecases/          GetContactsUseCase.ts, GetContactUseCase.ts, ...
  data/repositories/        ContactRepositoryImpl.ts
  data/datasources/         ContactRemoteDataSource.ts
  presentation/hooks/       contactQueries.ts (React Query hooks)
  presentation/state/       contactStore.ts (Zustand)
  presentation/views/       ContactScreen.tsx
  di.ts                     (dependency wiring)
```

### 5. Format generated code

```bash
spry format
```

Runs Prettier on all feature files.

## Commands

| Command | Description |
|---------|-------------|
| `spry init` | Initialize a new Expo project with Spry |
| `spry init -y` | Non-interactive with defaults |
| `spry new <feature>` | Create a feature domain skeleton |
| `spry build <feature>` | Generate implementation from contract |
| `spry build all` | Build all features |
| `spry build <feature> --dry-run` | Preview what would be generated |
| `spry build <feature> --force` | Regenerate all Spry-owned files |
| `spry format` | Format feature files with Prettier |
| `spry skill` | Install Claude Code skill for AI-assisted development |

## Incremental Builds

Add a new method to your abstract class and run `spry build` again. Spry detects new methods and injects them into existing files without touching developer-owned code.

```
$ spry build contact

  Created: domain/usecases/SearchContactsUseCase.ts
  Injected: ContactRepositoryImpl.ts -> searchContacts()
  Injected: ContactRemoteDataSource.ts -> searchContacts()
  Injected: contactQueries.ts (regenerated)
  Injected: di.ts -> searchContactsUseCase
  Skipped: contactStore.ts (developer-owned)
```

## What Spry Generates vs What You Own

| Spry-owned (regenerated/injected) | Developer-owned (generated once) |
|-----------------------------------|----------------------------------|
| Use cases, RepositoryImpl, DataSource | Store, Screen component |
| React Query hooks, DI wiring | Domain models |
| Barrel exports (index.ts) | Abstract repository contract |

## Configuration

`spry init` creates:

- `.spryrc.json` — project config (state management, HTTP client, query client)
- `.env` — `EXPO_PUBLIC_API_URL` for the HTTP client base URL
- `.prettierrc` — formatting config
- `.spry-manifest.json` — tracks generated methods per feature

## Decorators

Uses [`@spry-cli/decorators`](https://www.npmjs.com/package/@spry-cli/decorators) — read statically via AST, zero runtime overhead.

| Decorator | Description |
|-----------|-------------|
| `@BaseURL(path)` | Base path prefix for all methods |
| `@GET(path)` `@POST(path)` `@PATCH(path)` `@PUT(path)` `@DELETE(path)` | HTTP verb + path |
| `@Cache(seconds)` | Sets `staleTime` in React Query |
| `@Paginated()` | Generates `useInfiniteQuery` |
| `@Param(name)` | Path parameter |
| `@Query(name)` | Query string parameter |
| `@Body()` | Request body |
| `@Header(name)` | Request header |

## Claude Code Integration

Spry ships with a skill for [Claude Code](https://claude.ai/code) that teaches the AI assistant how to use Spry:

```bash
spry skill
```

This installs a skill in `.claude/skills/spry/` that enables:
- `/spry contact` — Claude creates the full feature (models, contract, build, format)
- Auto-detection when you ask to "create a feature" or "scaffold an API layer"
- Knowledge of all decorators, file ownership rules, and best practices

## License

MIT
