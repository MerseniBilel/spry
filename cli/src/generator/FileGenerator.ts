import { join } from 'node:path'
import Mustache from 'mustache'
import { readFileContent, writeFileWithDir, getTemplatesDir } from '../utils/fs.js'

const TEMPLATES_DIR = getTemplatesDir()

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
