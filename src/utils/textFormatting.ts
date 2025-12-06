
export function formatColumnName(name: string): string {
  if (!name) return name;
  const withSpaces = name.replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}
