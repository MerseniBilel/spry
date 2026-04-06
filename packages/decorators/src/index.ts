// Method decorators — HTTP verb + path
export function GET(_path: string): MethodDecorator {
  return () => {}
}

export function POST(_path: string): MethodDecorator {
  return () => {}
}

export function PATCH(_path: string): MethodDecorator {
  return () => {}
}

export function PUT(_path: string): MethodDecorator {
  return () => {}
}

export function DELETE(_path: string): MethodDecorator {
  return () => {}
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
  return () => {}
}

export function Paginated(): MethodDecorator {
  return () => {}
}
