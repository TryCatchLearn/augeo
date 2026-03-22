export function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOptionalEnv(name: string, fallback: string) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  return value;
}
