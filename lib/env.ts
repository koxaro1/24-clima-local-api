export function requireEnv(name: string): string {
  const valor = process.env[name];
  if (!valor) throw new Error(`Falta la variable de entorno ${name}`);
  return valor;
}
