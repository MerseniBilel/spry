import { Project, SourceFile } from 'ts-morph'

export class RepositoryParser {
  private project: Project

  constructor(tsConfigFilePath?: string) {
    this.project = new Project({
      tsConfigFilePath,
    })
  }

  parse(filePath: string): SourceFile {
    return this.project.addSourceFileAtPath(filePath)
  }
}
