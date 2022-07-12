export type Credentials = { username: string; hashedPassword: string };

export function getLocalCredentials(): Credentials | null {
  const username = localStorage.username;
  const hashedPassword = localStorage.hashedPassword;
  if (username !== undefined && hashedPassword !== undefined) {
    return {
      username: username,
      hashedPassword: hashedPassword,
    };
  }
}

export function saveCredentials(credentials: Credentials) {
  localStorage.username = credentials.username;
  localStorage.hashedPassword = credentials.hashedPassword;
}

export function deleteLocalCredentials() {
    delete localStorage.username;
    delete localStorage.hashedPassword;
}