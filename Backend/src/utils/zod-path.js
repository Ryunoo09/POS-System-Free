export const formatZodPath = (path) =>
  path.reduce((result, segment) => {
    if (typeof segment === 'number') {
      return `${result}[${segment}]`
    }

    return result ? `${result}.${segment}` : String(segment)
  }, '')
