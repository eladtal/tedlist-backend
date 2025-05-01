/**
 * Generates a URL for an avatar using the UI Avatars service
 * @param name The user's name to generate initials from
 * @returns A URL to the generated avatar
 */
export function getDefaultAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true&size=200`;
} 