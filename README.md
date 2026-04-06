<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/spry_white.svg" />
    <source media="(prefers-color-scheme: light)" srcset="assets/spry_black.svg" />
    <img src="assets/spry_black.svg" height="80" alt="Spry logo" />
  </picture>
  &nbsp;&nbsp;
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://readme-typing-svg.demolab.com?font=Inter&weight=800&size=48&pause=99999&color=FAF9F5&vCenter=true&width=160&height=80&lines=Spry" />
    <source media="(prefers-color-scheme: light)" srcset="https://readme-typing-svg.demolab.com?font=Inter&weight=800&size=48&pause=99999&color=09090B&vCenter=true&width=160&height=80&lines=Spry" />
    <img src="https://readme-typing-svg.demolab.com?font=Inter&weight=800&size=48&pause=99999&color=09090B&vCenter=true&width=160&height=80&lines=Spry" alt="Spry" height="80" />
  </picture>
</p>

<p align="center">
  <strong>Define once, generate everything.</strong>
  <br />
  A CLI that scaffolds production-ready React Native (Expo) apps with Clean Architecture.
</p>

<p align="center">
  <a href="https://github.com/MerseniBilel/spry/actions"><img src="https://github.com/MerseniBilel/spry/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/spry"><img src="https://img.shields.io/npm/v/spry?color=e11d48" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/spry"><img src="https://img.shields.io/npm/dm/spry" alt="npm downloads" /></a>
  <a href="https://github.com/MerseniBilel/spry/blob/master/LICENSE"><img src="https://img.shields.io/github/license/MerseniBilel/spry" alt="license" /></a>
</p>

---

## What is Spry?

Spry reads a typed contract you write — an abstract repository class decorated with `@spry-cli/decorators` — and generates the entire implementation stack: data layer, use cases, state management, and dependency injection wiring. Clean Architecture boundaries are enforced by default because Spry generates them for you.

```ts
import { GET, PATCH, DELETE, Param, Body, BaseURL, Cache } from '@spry-cli/decorators'
import type { UserProfile, UpdateProfileInput } from '../models/UserProfile'

@BaseURL('/api/v1')
export abstract class ProfileRepository {

  @GET('/profile/:userId')
  @Cache(60)
  getProfile(@Param('userId') userId: string): Promise<UserProfile> { throw new Error('contract') }

  @PATCH('/profile/:userId')
  updateProfile(
    @Param('userId') userId: string,
    @Body() input: UpdateProfileInput
  ): Promise<UserProfile> { throw new Error('contract') }

  @DELETE('/profile/:userId')
  deleteProfile(@Param('userId') userId: string): Promise<void> { throw new Error('contract') }
}
```

Run `spry build profile` and get:

```
features/profile/
  presentation/  (hooks, queries, store, views, components)
  domain/        (use cases, abstract repo, models, errors)
  data/          (repo impl, data source, DTOs, mappers)
  di.ts          (dependency wiring)
```

## Features

- **Contract-driven** — write the abstract class, Spry generates everything else
- **Clean Architecture by default** — domain, data, and presentation layers are generated with strict boundaries
- **Incremental builds** — add a method to your contract, run `spry build` again, and only the new code is injected
- **Tech-choice flexibility** — pick fetch or axios, React Query, Zustand — templates swap without touching your code
- **Typed error handling** — generates `DomainError`, `HttpError`, `NetworkError` hierarchy with typed React Query integration
- **Zero-config DI** — simple singleton `di.ts` per feature, no heavy DI containers

## Quick Start

### Install

```bash
# In your Expo project
npx spry init
```

### Create a feature

```bash
npx spry new profile
```

This creates the domain skeleton. Open `src/features/profile/domain/repositories/ProfileRepository.ts` and define your contract using `@spry-cli/decorators`.

### Generate the implementation

```bash
npx spry build profile
```

Spry parses your abstract class, resolves all types, and generates the full feature stack.

### Options

```bash
spry build profile --dry-run   # preview what will be generated
spry build profile --force     # regenerate all Spry-owned files
spry build all                 # build every feature
spry format                    # format generated code with Prettier
spry skill                     # install Claude Code AI skill
```

## How It Works

```
Abstract Repository  →  ts-morph parser  →  Normalized JSON  →  Mustache templates  →  Generated files
   (you write)          (Type Checker)       (pre-split by        (one per tech          (Clean Arch
                                              query/mutation)       choice)                structure)
```

1. **Parse** — ts-morph reads your abstract class with the full TypeScript Type Checker (same engine as VS Code), resolving imports, generics, and nullability
2. **Normalize** — decorators and type info are mapped into a structured JSON context with pre-split `queries`, `paginatedQueries`, and `mutations` arrays
3. **Generate** — Mustache templates (selected by your `.spryrc.json` config) render the implementation files
4. **Inject** — on subsequent builds, new methods are injected into existing files via ts-morph AST operations (no regex)

## `@spry-cli/decorators`

Installed in your Expo project. Decorators are read statically via AST — no runtime overhead.

| Decorator | Type | Description |
|-----------|------|-------------|
| `@GET(path)` | Method | HTTP GET request |
| `@POST(path)` | Method | HTTP POST request |
| `@PATCH(path)` | Method | HTTP PATCH request |
| `@PUT(path)` | Method | HTTP PUT request |
| `@DELETE(path)` | Method | HTTP DELETE request |
| `@Cache(seconds)` | Method | Sets `staleTime` in React Query |
| `@Paginated()` | Method | Generates `useInfiniteQuery` instead of `useQuery` |
| `@BaseURL(url)` | Class | Base path prefix for all methods |
| `@Param(name)` | Parameter | Path parameter (`:name`) |
| `@Query(name)` | Parameter | Query string parameter |
| `@Body()` | Parameter | Request body |
| `@Header(name)` | Parameter | Request header |

## Configuration

`spry init` creates a `.spryrc.json` in your project root:

```json
{
  "stateManagement": "zustand",
  "networkLayer": "fetch",
  "queryClient": "react-query",
  "apiRoutes": false,
  "testing": "vitest",
  "checksum": "..."
}
```

This file is integrity-checked on every build. If manually modified, Spry will ask you to re-run `spry init`.

## File Ownership

Spry tracks what it owns vs. what you own:

| Spry-owned (regenerated/injected) | Developer-owned (generated once) |
|-----------------------------------|----------------------------------|
| Use cases, RepositoryImpl, DataSource | `<feature>Store.ts` |
| Queries/hooks, DI wiring, DTOs, mappers | Domain models |
| Barrel index files | Abstract repository |

## Tech Stack

The generated code uses:

- **React Query** — server state (queries, mutations, caching)
- **Zustand** — client/UI state only
- **fetch** or **axios** — HTTP layer (normalized behind `httpClient.ts`)
- **TypeScript** — strict mode, zero `any`

## Packages

| Package | Description |
|---------|-------------|
| [`@spry-cli/spry`](cli/) | CLI tool |
| [`@spry-cli/decorators`](packages/decorators/) | TypeScript decorators for contracts |

## Claude Code Integration

Spry ships with a skill for [Claude Code](https://claude.ai/code):

```bash
spry skill
```

This teaches the AI assistant how to use Spry — create features, write contracts, generate code, and follow best practices. Use `/spry <feature-name>` in Claude Code to scaffold a feature with AI assistance.

## Roadmap

- [x] REST + fetch/axios + React Query + Zustand
- [x] `spry doctor` command
- [ ] `spry doctor --fix` (auto-repair project issues)
- [ ] Jotai support
- [ ] GraphQL + urql + codegen
- [ ] Test generation (Vitest for use cases)
- [ ] Maestro E2E scaffold
- [ ] VS Code extension

## Development

```bash
# Clone and install
git clone https://github.com/MerseniBilel/spry.git
cd spry
pnpm install

# Build all packages
pnpm build

# Run CLI in dev mode
pnpm --filter spry dev

# Run tests
pnpm test

# Run a single test file
pnpm --filter spry test -- --run tests/unit/utils/string.test.ts

# Format
pnpm format
```

## Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or pull requests — all input is appreciated.

### How to contribute

1. **Fork** the repository
2. **Create a branch** from `master` for your change

   ```bash
   git checkout -b feat/my-feature
   ```

3. **Install dependencies** and make sure everything builds

   ```bash
   pnpm install && pnpm build
   ```

4. **Make your changes** — follow the existing code style (Prettier + ESLint handle formatting)
5. **Write or update tests** — every module should have a corresponding test file
6. **Run the full test suite** before pushing

   ```bash
   pnpm test
   ```

7. **Open a Pull Request** against `master` with a clear description of what you changed and why

### Guidelines

- Keep PRs focused — one feature or fix per PR
- Follow the existing architecture patterns (parser, generator, injector separation)
- Mustache templates should remain logic-less — use pre-split data arrays, not conditionals
- Spry-owned files must be safe to regenerate; never put developer logic in them
- All new CLI code should be in TypeScript with strict types

### Reporting issues

Found a bug or have a feature idea? [Open an issue](https://github.com/MerseniBilel/spry/issues/new) with:

- A clear title and description
- Steps to reproduce (for bugs)
- Expected vs. actual behavior

## License

MIT - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with <a href="https://github.com/MerseniBilel/spry">Spry</a>
</p>
