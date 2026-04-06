/* eslint-disable @typescript-eslint/no-explicit-any */

// No-op decorators — read statically by Spry CLI via ts-morph.
// Must handle abstract methods where descriptor is undefined
// (Babel legacy decorators call Object.defineProperty with the
// return value, so returning undefined causes a crash).

function noop(
  _target: any,
  _key: string | symbol,
  descriptor?: PropertyDescriptor
): PropertyDescriptor | undefined {
  return descriptor
}

// Method decorators — HTTP verb + path
export function GET(_path: string): MethodDecorator {
  return noop as MethodDecorator
}

export function POST(_path: string): MethodDecorator {
  return noop as MethodDecorator
}

export function PATCH(_path: string): MethodDecorator {
  return noop as MethodDecorator
}

export function PUT(_path: string): MethodDecorator {
  return noop as MethodDecorator
}

export function DELETE(_path: string): MethodDecorator {
  return noop as MethodDecorator
}

// Parameter decorators
export function Param(_name: string): ParameterDecorator {
  return () => {}
}

export function Query(_name: string): ParameterDecorator {
  return () => {}
}

export function Body(): ParameterDecorator {
  return () => {}
}

export function Header(_name: string): ParameterDecorator {
  return () => {}
}

// Class decorator
export function BaseURL(_url: string): ClassDecorator {
  return () => {}
}

// Extra method decorators
export function Cache(_seconds: number): MethodDecorator {
  return noop as MethodDecorator
}

export function Paginated(): MethodDecorator {
  return noop as MethodDecorator
}
