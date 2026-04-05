import type { SourceFile } from 'ts-morph'

export interface FunctionDefinition {
  name: string
  isExported: boolean
  parameters: { name: string; type: string }[]
  returnType?: string
  body: string
}

export class FunctionInjector {
  inject(
    sourceFile: SourceFile,
    funcDef: FunctionDefinition
  ): boolean {
    const existing = sourceFile.getFunction(funcDef.name)
    if (existing) return false

    sourceFile.addFunction({
      name: funcDef.name,
      isExported: funcDef.isExported,
      parameters: funcDef.parameters,
      returnType: funcDef.returnType,
      statements: funcDef.body,
    })

    return true
  }
}
