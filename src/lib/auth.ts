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

export function saveLocalCredentials(credentials: Credentials) {
  localStorage.username = credentials.username;
  localStorage.hashedPassword = credentials.hashedPassword;
}

export function deleteLocalCredentials() {
    delete localStorage.username;
    delete localStorage.hashedPassword;
}

export function hash(s:string):number{
  var hash:number = 0;
  for (var i = 0; i < s.length; i++) {
      hash = ((hash<<5)-hash)+s.charCodeAt(i)
  }
  return hash
}

export function hashPassword(password: string): string {
  return hash(password).toString(16);
}
