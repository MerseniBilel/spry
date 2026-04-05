import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Mustache from 'mustache'
import { readFileContent, writeFileWithDir } from '../utils/fs.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = join(__dirname, '..', 'templates')

export class FileGenerator {
  async render(
    templatePath: string,
    context: Record<string, string>
  ): Promise<string> {
    const fullPath = join(TEMPLATES_DIR, templatePath)
    const template = await readFileContent(fullPath)
    return Mustache.render(template, context)
  }

  async renderAndWrite(
    templatePath: string,
    outputPath: string,
    context: Record<string, string>
  ): Promise<void> {
    const content = await this.render(templatePath, context)
    await writeFileWithDir(outputPath, content)
  }
}
