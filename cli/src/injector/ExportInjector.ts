import { type SourceFile, VariableDeclarationKind } from 'ts-morph'

export class ExportInjector {
  inject(
    sourceFile: SourceFile,
    name: string,
    initializer: string
  ): boolean {
    const existing = sourceFile.getVariableDeclaration(name)
    if (existing) return false

    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [{ name, initializer }],
    })

    return true
  }
}
