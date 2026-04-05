import type { MethodDeclaration, ParameterDeclaration } from 'ts-morph'
import type { ParsedReturnType } from '../types/parser.js'

export class TypeResolver {
  resolveReturnType(method: MethodDeclaration): ParsedReturnType {
    const type = method.getReturnType()
    let typeName = type.getText(method)

    // Unwrap Promise<T>
    if (typeName.startsWith('Promise<')) {
      typeName = typeName.slice('Promise<'.length, -1)
    }

    const isVoid = typeName === 'void'
    const isNullable = typeName.includes(' | null')
    const cleanType = typeName.replace(/ \| null/g, '').trim()
    const isArray = cleanType.endsWith('[]')
    const baseTypeName = isArray ? cleanType.slice(0, -2) : cleanType

    return {
      typeName: isVoid ? 'void' : cleanType,
      baseTypeName: isVoid ? 'void' : baseTypeName,
      isNullable,
      isArray,
      isVoid,
    }
  }

  resolveParamType(param: ParameterDeclaration): string {
    return param.getType().getText(param)
  }
}
