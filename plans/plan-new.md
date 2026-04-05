# Plan: `spry new <featureName>` Command

> Implementation plan for the `spry new` command — Phase 1 MVP scope only.
> Creates the domain skeleton for a new feature so the developer can define the abstract repository contract.

---

## Context

With `spry init` complete, developers need `spry new <featureName>` to scaffold a feature's folder structure and starter files. This command creates the domain skeleton — an abstract repository class shell and a model type placeholder — plus all empty directories for data, domain, and presentation layers. The developer then fills in the abstract class with `@spry-cli/decorators` and runs `spry build`.

---

## Current State

Stubs exist but are empty:
- `cli/src/commands/new.ts` — placeholder with TODO
- `cli/src/prompts/newPrompts.ts` — empty TODO comment
- `cli/src/generator/FeatureGenerator.ts` — empty class
- `cli/src/generator/FileGenerator.ts` — empty class
- `cli/src/manifest/ManifestReader.ts` — empty class

Already implemented and reusable:
- `cli/src/config/ConfigReader.ts` — reads `.spryrc.json`
- `cli/src/manifest/ManifestWriter.ts` — writes `.spry-manifest.json` (needs `addFeature` method)
- `cli/src/utils/logger.ts` — Clack-based logger
- `cli/src/utils/fs.ts` — `ensureDir`, `writeFileWithDir`, `readFileContent`, `fileExists`
- `cli/src/utils/string.ts` — `pascalCase`, `camelCase`, `kebabCase`
- `cli/src/generator/ScaffoldGenerator.ts` — pattern reference for template rendering

---

## What `spry new <featureName>` Generates

Per the PRD (Section 4 + Section 3):

```
src/features/<featureName>/
  presentation/
    views/           .gitkeep
    components/      .gitkeep
    hooks/           .gitkeep
    state/           .gitkeep
  domain/
    usecases/        .gitkeep
    repositories/    <Feature>Repository.ts  (abstract class shell)
    models/          <Feature>.ts            (type placeholder)
    errors/          .gitkeep
  data/
    repositories/    .gitkeep
    datasources/     .gitkeep
    models/          .gitkeep
  di.ts              — NOT generated here (spry build creates this)
```

### Generated Files

1. **`domain/repositories/<Feature>Repository.ts`** — abstract class shell with `@BaseURL` import and placeholder comment:
   ```ts
   import { BaseURL } from '@spry-cli/decorators'

   @BaseURL('/api/v1/<featureName>')
   export abstract class <Feature>Repository {
     // Define your methods here using @spry-cli/decorators
     // Then run: spry build <featureName>
   }
   ```

2. **`domain/models/<Feature>.ts`** — type placeholder:
   ```ts
   export interface <Feature> {
     // Define your domain model here
   }
   ```

---

## Implementation Steps

### 1. Mustache Templates for Feature Scaffold

- [ ] Create `cli/src/templates/feature/repository.abstract.mustache`
- [ ] Create `cli/src/templates/feature/model.mustache`

Template variables: `{{featureName}}`, `{{FeatureName}}` (PascalCase), `{{featureNameKebab}}` (kebab-case)

---

### 2. ManifestReader — `cli/src/manifest/ManifestReader.ts`

- [ ] Implement `read(projectRoot: string): Promise<SpryManifest | null>` — reads and parses `.spry-manifest.json`, returns null if not found
- [ ] Implement `exists(projectRoot: string): Promise<boolean>`
- [ ] Implement `hasFeature(projectRoot: string, featureName: string): Promise<boolean>` — checks if feature already exists in manifest

Follow the same pattern as `ConfigReader.ts`.

---

### 3. ManifestWriter — Add Feature Method

- [ ] Add `addFeature(projectRoot: string, featureName: string): Promise<void>` to existing `ManifestWriter`
  - Reads current manifest (via ManifestReader)
  - Adds new feature entry with empty `generatedMethods: []`
  - Writes updated manifest back

---

### 4. FeatureGenerator — `cli/src/generator/FeatureGenerator.ts`

- [ ] Implement `generate(srcRoot: string, featureName: string): Promise<string[]>`
  - Renders the two Mustache templates (repository + model) with context variables
  - Creates all empty directories with `.gitkeep`
  - Returns array of created file/dir paths for logging

Template context:
```ts
{
  featureName: 'profile',           // camelCase (as-is or transformed)
  FeatureName: 'Profile',           // PascalCase
  featureNameKebab: 'profile',      // kebab-case
}
```

Directory list to create:
```
features/<featureName>/presentation/views/
features/<featureName>/presentation/components/
features/<featureName>/presentation/hooks/
features/<featureName>/presentation/state/
features/<featureName>/domain/usecases/
features/<featureName>/domain/errors/
features/<featureName>/data/repositories/
features/<featureName>/data/datasources/
features/<featureName>/data/models/
```

Uses `Mustache.render()` for templates and existing `writeFileWithDir` / `ensureDir` utilities.

---

### 5. FileGenerator — `cli/src/generator/FileGenerator.ts`

- [ ] Implement `render(templatePath: string, context: Record<string, string>): Promise<string>` — reads template file, renders with Mustache, returns string
- [ ] Implement `renderAndWrite(templatePath: string, outputPath: string, context: Record<string, string>): Promise<void>` — render + write to disk

This is a reusable utility that `FeatureGenerator` (and later `spry build`) will use.

---

### 6. Prompts — `cli/src/prompts/newPrompts.ts`

- [ ] Implement feature name validation (if not passed as argument):
  - Must be non-empty
  - Lowercase letters, numbers, and hyphens only (same regex as init)
  - Warn if feature already exists in manifest, confirm overwrite

The `new` command receives `featureName` as a required positional argument, so prompts are minimal — mainly just the overwrite confirmation if the feature already exists.

---

### 7. Command Orchestration — `cli/src/commands/new.ts`

- [ ] Wire the full `new` flow:
  1. `logger.intro('spry new')` — show banner
  2. Validate feature name format (lowercase, alphanumeric + hyphens)
  3. Read `.spryrc.json` via `ConfigReader` — if not found, error: "Run `spry init` first"
  4. Read `.spry-manifest.json` via `ManifestReader` — check if feature already exists
  5. If feature exists → prompt overwrite confirmation (or skip with `-y`)
  6. `FeatureGenerator.generate()` — create skeleton with spinner
  7. `ManifestWriter.addFeature()` — register feature in manifest
  8. `logger.outro()` — show success + next steps ("Define your methods in <Feature>Repository.ts, then run spry build <featureName>")
- [ ] Handle errors with clear messages
- [ ] Support `--yes` / `-y` flag for non-interactive mode (skip overwrite confirmation)

---

## Dependency Graph (Implementation Order)

```
1. Mustache templates (repository.abstract + model)
2. FileGenerator (render utility)
3. ManifestReader
4. ManifestWriter.addFeature (extends existing)
5. FeatureGenerator (uses FileGenerator)
6. newPrompts (minimal — overwrite confirmation)
7. new command orchestration (wires everything)
```

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `cli/src/templates/feature/repository.abstract.mustache` |
| Create | `cli/src/templates/feature/model.mustache` |
| Modify | `cli/src/generator/FileGenerator.ts` |
| Modify | `cli/src/generator/FeatureGenerator.ts` |
| Modify | `cli/src/manifest/ManifestReader.ts` |
| Modify | `cli/src/manifest/ManifestWriter.ts` (add `addFeature`) |
| Modify | `cli/src/prompts/newPrompts.ts` |
| Modify | `cli/src/commands/new.ts` |

---

## Verification

1. Run `pnpm --filter spry build` — ensure CLI compiles
2. Manual test: run `spry init -y` in a temp directory, then `spry new profile`
   - Verify folder structure matches the expected tree above
   - Verify `ProfileRepository.ts` has correct abstract class shell
   - Verify `Profile.ts` has correct interface placeholder
   - Verify all `.gitkeep` files in empty directories
   - Verify `.spry-manifest.json` updated with `profile` feature entry
3. Test duplicate detection: run `spry new profile` again — should warn and prompt overwrite
4. Test without init: run `spry new profile` in empty dir — should error "Run `spry init` first"
5. Run `pnpm --filter spry test` — ensure existing tests still pass
