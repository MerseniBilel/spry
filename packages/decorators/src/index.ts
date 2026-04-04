// Method decorators — HTTP verb + path
export function GET(path: string): MethodDecorator {
  return (_target, _propertyKey, descriptor) => descriptor
}

export function POST(path: string): MethodDecorator {
  return (_target, _propertyKey, descriptor) => descriptor
}

export function PATCH(path: string): MethodDecorator {
  return (_target, _propertyKey, descriptor) => descriptor
}

export function PUT(path: string): MethodDecorator {
  return (_target, _propertyKey, descriptor) => descriptor
}

export function DELETE(path: string): MethodDecorator {
  return (_target, _propertyKey, descriptor) => descriptor
}

// Parameter decorators
export function Param(name: string): ParameterDecorator {
  return () => {}
}

export function Query(name: string): ParameterDecorator {
  return () => {}
}

export function Body(): ParameterDecorator {
  return () => {}
}

export function Header(name: string): ParameterDecorator {
  return () => {}
}

// Class decorator
export function BaseURL(url: string): ClassDecorator {
  return (target) => target
}

// Extra method decorators
export function Cache(seconds: number): MethodDecorator {
  return (_target, _propertyKey, descriptor) => descriptor
}

export function Paginated(): MethodDecorator {
  return (_target, _propertyKey, descriptor) => descriptor
}
