import { join } from 'node:path'
import { readFileContent, writeFileWithDir, fileExists } from './fs.js'

const SPRY_IGNORE = '**/domain/repositories/*.ts'

export async function patchEslintConfig(
  projectRoot: string
): Promise<boolean> {
  const configPath = join(projectRoot, 'eslint.config.js')
  if (!(await fileExists(configPath))) return false

  const content = await readFileContent(configPath)

  if (content.includes(SPRY_IGNORE)) return true

  // Add spry ignore + disable import/namespace for feature files + typescript resolver for path aliases
  const patched = content.replace(
    /ignores:\s*\[([^\]]*)\]/,
    (match, existing: string) => {
      const trimmed = existing.trim()
      if (trimmed) {
        return `ignores: [${existing}, '${SPRY_IGNORE}']`
      }
      return `ignores: ['${SPRY_IGNORE}']`
    }
  )

  let result = patched !== content ? patched : content

  // Add import/namespace override and typescript resolver for feature files
  if (!result.includes('import/namespace')) {
    result = result.replace(
      /]\s*\)\s*;?\s*$/,
      `  {\n    files: ['src/features/**/*.ts', 'src/features/**/*.tsx', 'src/shared/**/*.ts'],\n    rules: {\n      'import/namespace': 'off',\n    },\n    settings: {\n      'import/resolver': {\n        typescript: true,\n      },\n    },\n  },\n]);`
    )
  }

  if (result !== content) {
    await writeFileWithDir(configPath, result)
    return true
  }

  return false
}
