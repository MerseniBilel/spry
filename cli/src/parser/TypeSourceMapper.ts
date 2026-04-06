import type { SourceFile } from 'ts-morph'
import { kebabCase } from '../utils/string.js'

/**
 * Reads import declarations from the repository source file
 * and builds a map of TypeName → alias import path.
 *
 * Example: if the repository has
 *   import type { User, CreateUserInput } from '../models/User'
 * and the feature is "user", the map will contain:
 *   User → @features/user/domain/models/User
 *   CreateUserInput → @features/user/domain/models/User
 */
export class TypeSourceMapper {
  build(
    sourceFile: SourceFile,
    featureName: string
  ): Map<string, string> {
    const map = new Map<string, string>()
    const kebab = kebabCase(featureName)

    for (const decl of sourceFile.getImportDeclarations()) {
      const specifier = decl.getModuleSpecifierValue()
      if (decl.isTypeOnly() || specifier.includes('decorators')) {
        // only process type imports, skip decorator imports
        if (specifier.includes('decorators')) continue
      }

      const aliasPath = this.toAliasPath(specifier, kebab)
      if (!aliasPath) continue

      for (const named of decl.getNamedImports()) {
        map.set(named.getName(), aliasPath)
      }
    }

    return map
  }

  private toAliasPath(
    specifier: string,
    featureNameKebab: string
  ): string | null {
    // Already an alias path
    if (specifier.startsWith('@features/')) {
      return specifier.replace(/\.ts$/, '')
    }

    // Relative path from domain/repositories/ — resolve to alias
    // ../models/User → @features/{feature}/domain/models/User
    if (specifier.startsWith('../models/')) {
      const file = specifier
        .replace('../models/', '')
        .replace(/\.ts$/, '')
      return `@features/${featureNameKebab}/domain/models/${file}`
    }

    // ./models/User or other relative paths
    if (specifier.startsWith('./models/')) {
      const file = specifier
        .replace('./models/', '')
        .replace(/\.ts$/, '')
      return `@features/${featureNameKebab}/domain/models/${file}`
    }

    // If it already uses @features or @shared alias, keep it
    if (specifier.startsWith('@')) {
      return specifier.replace(/\.ts$/, '')
    }

    return null
  }
}
