import { join } from 'node:path'
import {
  readFileContent,
  writeFileWithDir,
  ensureDir,
  fileExists,
  getTemplatesDir,
} from '../utils/fs.js'
import type { NetworkLayer } from '../types/config.js'

const TEMPLATES_DIR = join(getTemplatesDir(), 'shared')

const SCAFFOLD_DIRS = [
  'shared/components',
  'shared/hooks',
  'shared/utils',
  'shared/constants',
  'shared/types',
]

interface TemplateMapping {
  template: string
  output: string
}

const ERROR_TEMPLATES: TemplateMapping[] = [
  {
    template: 'errors.base.mustache',
    output: 'shared/errors/DomainError.ts',
  },
  {
    template: 'errors.http.mustache',
    output: 'shared/errors/HttpError.ts',
  },
  {
    template: 'errors.network.mustache',
    output: 'shared/errors/NetworkError.ts',
  },
  {
    template: 'errors.index.mustache',
    output: 'shared/errors/index.ts',
  },
]

function getHttpTemplate(
  networkLayer: NetworkLayer
): TemplateMapping {
  const template =
    networkLayer === 'axios' ? 'http.axios.mustache' : 'http.fetch.mustache'
  return { template, output: 'shared/http/httpClient.ts' }
}

export class ScaffoldGenerator {
  async generate(
    srcRoot: string,
    networkLayer: NetworkLayer
  ): Promise<string[]> {
    const created: string[] = []

    const httpMapping = getHttpTemplate(networkLayer)
    const allMappings = [...ERROR_TEMPLATES, httpMapping]

    for (const mapping of allMappings) {
      const templatePath = join(TEMPLATES_DIR, mapping.template)
      const content = await readFileContent(templatePath)
      const outputPath = join(srcRoot, mapping.output)
      await writeFileWithDir(outputPath, content)
      created.push(mapping.output)
    }

    for (const dir of SCAFFOLD_DIRS) {
      const dirPath = join(srcRoot, dir)
      await ensureDir(dirPath)
      await writeFileWithDir(join(dirPath, '.gitkeep'), '')
      created.push(dir)
    }

    return created
  }

  // Renders only the templates whose output path appears in `targets`,
  // so existing files (potentially edited by the developer) are never overwritten.
  async generateMissing(
    srcRoot: string,
    networkLayer: NetworkLayer,
    targets: string[]
  ): Promise<string[]> {
    const wanted = new Set(targets)
    const written: string[] = []

    const allMappings = [
      ...ERROR_TEMPLATES,
      getHttpTemplate(networkLayer),
    ]

    for (const mapping of allMappings) {
      if (!wanted.has(mapping.output)) continue
      const outputPath = join(srcRoot, mapping.output)
      // Re-check at write time so a stale `targets` list or a file that
      // appeared between the check and the write never overwrites real content.
      if (await fileExists(outputPath)) continue
      const templatePath = join(TEMPLATES_DIR, mapping.template)
      const content = await readFileContent(templatePath)
      await writeFileWithDir(outputPath, content)
      written.push(mapping.output)
    }

    return written
  }
}
