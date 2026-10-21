export function cn(
  ...args: Array<string | boolean | null | undefined>
): string {
  return args.filter((value) => typeof value === 'string' && value).join(' ')
}
