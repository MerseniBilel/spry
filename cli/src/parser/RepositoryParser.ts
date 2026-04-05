import { Project } from 'ts-morph'
import type { ClassDeclaration, SourceFile } from 'ts-morph'

export interface ParsedRepository {
  sourceFile: SourceFile
  classDecl: ClassDeclaration
  className: string
}

export class RepositoryParser {
  private project: Project

  constructor(tsConfigFilePath?: string) {
    this.project = new Project({
      tsConfigFilePath,
      skipAddingFilesFromTsConfig: true,
    })
  }

  parse(filePath: string): ParsedRepository {
    const sourceFile = this.project.addSourceFileAtPath(filePath)

    const classes = sourceFile.getClasses()
    const abstractClass = classes.find((c) => c.isAbstract())

    if (!abstractClass) {
      throw new Error(
        `No abstract class found in ${filePath}`
      )
    }

    return {
      sourceFile,
      classDecl: abstractClass,
      className: abstractClass.getName() ?? 'UnknownRepository',
    }
  }
}
