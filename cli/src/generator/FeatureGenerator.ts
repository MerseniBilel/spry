import { join } from 'node:path'
import { ensureDir, writeFileWithDir } from '../utils/fs.js'
import { pascalCase, camelCase, kebabCase } from '../utils/string.js'
import { FileGenerator } from './FileGenerator.js'

const GITKEEP_DIRS = [
  'presentation/views',
  'presentation/components',
  'presentation/hooks',
  'presentation/state',
  'domain/usecases',
  'domain/errors',
  'data/repositories',
  'data/datasources',
  'data/models',
]

interface TemplateMapping {
  template: string
  output: string
}

export class FeatureGenerator {
  private fileGenerator = new FileGenerator()

  async generate(
    srcRoot: string,
    featureName: string
  ): Promise<string[]> {
    const created: string[] = []
    const featureDir = join(srcRoot, 'features', featureName)
    const pascal = pascalCase(featureName)
    const camel = camelCase(featureName)
    const kebab = kebabCase(featureName)

    const context = {
      featureName: camel,
      FeatureName: pascal,
      featureNameKebab: kebab,
    }

    const templates: TemplateMapping[] = [
      {
        template: 'feature/repository.abstract.mustache',
        output: `domain/repositories/${pascal}Repository.ts`,
      },
      {
        template: 'feature/model.mustache',
        output: `domain/models/${pascal}.ts`,
      },
    ]

    for (const mapping of templates) {
      const outputPath = join(featureDir, mapping.output)
      await this.fileGenerator.renderAndWrite(
        mapping.template,
        outputPath,
        context
      )
      created.push(mapping.output)
    }

    for (const dir of GITKEEP_DIRS) {
      const dirPath = join(featureDir, dir)
      await ensureDir(dirPath)
      await writeFileWithDir(join(dirPath, '.gitkeep'), '')
      created.push(dir)
    }

    return created
  }
}
