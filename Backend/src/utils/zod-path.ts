export const formatZodPath = (path: readonly PropertyKey[]): string =>
  path.reduce<string>((result, segment) => {
    if (typeof segment === 'number') {
      return `${result}[${segment}]`
    }

    return result ? `${result}.${String(segment)}` : String(segment)
  }, '')
