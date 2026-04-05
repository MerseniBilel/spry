import type { ClassDeclaration } from 'ts-morph'
import { DecoratorReader } from './DecoratorReader.js'
import { TypeResolver } from './TypeResolver.js'
import type { ParsedMethod } from '../types/parser.js'

export class MethodParser {
  private decoratorReader = new DecoratorReader()
  private typeResolver = new TypeResolver()

  parse(classDecl: ClassDeclaration): ParsedMethod[] {
    const methods: ParsedMethod[] = []

    for (const method of classDecl.getMethods()) {
      if (!method.isAbstract()) continue

      const decorators = this.decoratorReader.readMethodDecorators(method)
      if (!decorators) continue

      const returnType = this.typeResolver.resolveReturnType(method)
      const params = this.decoratorReader.readParameterDecorators(method)

      methods.push({
        name: method.getName(),
        decorators,
        returnType,
        params,
      })
    }

    return methods
  }
}
