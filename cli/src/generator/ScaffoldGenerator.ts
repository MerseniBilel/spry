import { join, dirname } from 'node:path'
import { readFileContent, writeFileWithDir, ensureDir } from '../utils/fs.js'
import { fileURLToPath } from 'node:url'
import type { NetworkLayer } from '../types/config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = join(__dirname, '..', 'templates', 'shared')

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
}
