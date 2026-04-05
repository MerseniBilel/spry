import { type ClassDeclaration, Scope } from 'ts-morph'

export interface MethodDefinition {
  name: string
  isAsync: boolean
  returnType: string
  parameters: { name: string; type: string }[]
  body: string
}

export class MethodInjector {
  inject(
    classDecl: ClassDeclaration,
    methodDef: MethodDefinition
  ): boolean {
    const existing = classDecl.getMethod(methodDef.name)
    if (existing) return false

    classDecl.addMethod({
      name: methodDef.name,
      isAsync: methodDef.isAsync,
      returnType: methodDef.returnType,
      scope: Scope.Public,
      parameters: methodDef.parameters,
      statements: methodDef.body,
    })

    return true
  }
}
