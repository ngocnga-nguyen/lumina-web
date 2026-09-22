export function getClientFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0];
}
