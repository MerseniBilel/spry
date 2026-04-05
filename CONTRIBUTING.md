# Contributing to Spry

Thanks for your interest in contributing to Spry! This guide will help you get started.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/spry.git
   cd spry
   ```
3. **Install dependencies:**
   ```bash
   pnpm install
   ```
4. **Build all packages:**
   ```bash
   pnpm build
   ```
5. **Run tests:**
   ```bash
   pnpm test
   ```
6. **Link the CLI locally** for manual testing:
   ```bash
   pnpm link:cli
   ```

## Development Workflow

1. Create a branch from `master`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Make your changes
3. Run the full check:
   ```bash
   pnpm build && pnpm lint && pnpm test
   ```
4. Commit with a clear message
5. Push and open a Pull Request against `master`

## Project Structure

```
spry/
  cli/                  ← @spry-cli/spry (the CLI tool)
    src/
      commands/         ← init, new, build, format, skill
      parser/           ← ts-morph AST parsing pipeline
      generator/        ← Mustache template rendering + file generation
      injector/         ← ts-morph write operations for incremental builds
      manifest/         ← .spry-manifest.json read/write/diff
      config/           ← .spryrc.json read/write/integrity
      templates/        ← all .mustache template files
      skills/           ← Claude Code skill definition
    tests/
      unit/             ← mirrors src/ structure, one test per file
      integration/      ← full pipeline tests in temp directories
      fixtures/         ← sample repository files for parser tests
  packages/
    decorators/         ← @spry-cli/decorators (npm package)
  scripts/              ← version bumping
```

## Guidelines

### Code Style

- TypeScript strict mode, zero `any`
- 2-space indentation
- ESLint + Prettier enforced
- Run `pnpm lint` before committing

### Architecture

- **Parser** reads the abstract class via ts-morph AST — no runtime execution of decorators
- **Generator** renders Mustache templates — templates must remain logic-less (use pre-split data arrays, not conditionals)
- **Injector** uses ts-morph write API for incremental builds — no regex or string manipulation
- **Spry-owned files** are safe to regenerate. Never put developer logic in them
- **Developer-owned files** (store, screen, models) are generated once and never overwritten

### Testing

- Every module must have a corresponding test file
- Unit tests mock external dependencies
- Integration tests use real file system in temp directories
- CI blocks merge on any test failure

### Commits

- Keep commits focused — one change per commit
- Use clear commit messages describing what and why
- PRs should be focused — one feature or fix per PR

### Templates

- Mustache templates are logic-less by design
- Use pre-computed fields in the normalized context instead of conditionals
- One template per tech choice (e.g., `datasource.fetch.mustache` vs `datasource.axios.mustache`)

## Adding a New Decorator

1. Add the decorator function in `packages/decorators/src/index.ts`
2. Update `DecoratorReader` in `cli/src/parser/DecoratorReader.ts` to read it from AST
3. Add the field to `NormalizedMethod` or `NormalizedContext` in `cli/src/types/parser.ts`
4. Update `NormalizationMapper` to populate the new field
5. Update the relevant Mustache templates to use it
6. Add unit tests for the parser and integration tests for the full flow
7. Update the skill file in `cli/src/skills/spry/SKILL.md`

## Adding a New Template Variant

For example, adding Jotai support alongside Zustand:

1. Create `cli/src/templates/presentation/store.jotai.mustache`
2. Update `TemplateSelector` to pick it based on `.spryrc.json` config
3. Update `initPrompts.ts` to offer the new choice
4. Add integration tests with the new config
5. Update documentation

## Reporting Issues

[Open an issue](https://github.com/MerseniBilel/spry/issues/new/choose) with:

- A clear title and description
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Your Spry version (`spry --version`)

## Questions?

Open a [Discussion](https://github.com/MerseniBilel/spry/discussions) for questions, ideas, or feedback.
