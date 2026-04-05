import type { ClassDeclaration, MethodDeclaration } from 'ts-morph'
import type { ParsedDecorators, ParsedParam } from '../types/parser.js'

const HTTP_METHODS = new Set(['GET', 'POST', 'PATCH', 'PUT', 'DELETE'])

export class DecoratorReader {
  readBaseUrl(classDecl: ClassDeclaration): string | null {
    const decorator = classDecl.getDecorator('BaseURL')
    if (!decorator) return null

    const args = decorator.getArguments()
    if (args.length === 0) return null

    return this.extractStringLiteral(args[0].getText())
  }

  readMethodDecorators(method: MethodDeclaration): ParsedDecorators | null {
    let httpMethod: ParsedDecorators['httpMethod'] | null = null
    let path = ''
    let cacheSeconds: number | null = null
    let isPaginated = false

    for (const decorator of method.getDecorators()) {
      const name = decorator.getName()

      if (HTTP_METHODS.has(name)) {
        httpMethod = name as ParsedDecorators['httpMethod']
        const args = decorator.getArguments()
        if (args.length > 0) {
          path = this.extractStringLiteral(args[0].getText())
        }
      }

      if (name === 'Cache') {
        const args = decorator.getArguments()
        if (args.length > 0) {
          cacheSeconds = Number(args[0].getText())
        }
      }

      if (name === 'Paginated') {
        isPaginated = true
      }
    }

    if (!httpMethod) return null

    return { httpMethod, path, cacheSeconds, isPaginated }
  }

  readParameterDecorators(method: MethodDeclaration): ParsedParam[] {
    const params: ParsedParam[] = []

    for (const param of method.getParameters()) {
      for (const decorator of param.getDecorators()) {
        const name = decorator.getName()
        if (!['Param', 'Query', 'Body', 'Header'].includes(name)) continue

        const args = decorator.getArguments()
        const decoratorArg = args.length > 0
          ? this.extractStringLiteral(args[0].getText())
          : null

        params.push({
          name: param.getName(),
          type: param.getType().getText(param),
          decorator: name as ParsedParam['decorator'],
          decoratorArg,
        })
      }
    }

    return params
  }

  private extractStringLiteral(text: string): string {
    return text.replace(/^['"`]|['"`]$/g, '')
  }
}
