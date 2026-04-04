// Method decorators — HTTP verb + path
export function GET(_path: string): MethodDecorator {
  return (_target, _propertyKey, descriptor) => descriptor
}

export function POST(_path: string): MethodDecorator {
  return (_target, _propertyKey, descriptor) => descriptor
}

export function PATCH(_path: string): MethodDecorator {
  return (_target, _propertyKey, descriptor) => descriptor
}

export function PUT(_path: string): MethodDecorator {
  return (_target, _propertyKey, descriptor) => descriptor
}

export function DELETE(_path: string): MethodDecorator {
  return (_target, _propertyKey, descriptor) => descriptor
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
  return (target) => target
}

// Extra method decorators
export function Cache(_seconds: number): MethodDecorator {
  return (_target, _propertyKey, descriptor) => descriptor
}

export function Paginated(): MethodDecorator {
  return (_target, _propertyKey, descriptor) => descriptor
}
