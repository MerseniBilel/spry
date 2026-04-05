import type { SourceFile } from 'ts-morph'

export class ImportInjector {
  inject(
    sourceFile: SourceFile,
    moduleSpecifier: string,
    namedImports: string[]
  ): void {
    const existing = sourceFile.getImportDeclaration(moduleSpecifier)

    if (existing) {
      const currentImports = existing
        .getNamedImports()
        .map((i) => i.getName())
      const newImports = namedImports.filter(
        (n) => !currentImports.includes(n)
      )
      if (newImports.length > 0) {
        existing.addNamedImports(newImports)
      }
      return
    }

    sourceFile.addImportDeclaration({
      moduleSpecifier,
      namedImports,
    })
  }
}
