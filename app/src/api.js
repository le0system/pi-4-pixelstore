import { Platform } from 'react-native';

const fallback =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
const ROOT = (process.env.EXPO_PUBLIC_API_URL || fallback).replace(/\/$/, '');

export async function request(
  path,
  { method = 'GET', body, token, timeout = 12000 } = {},
) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${ROOT}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok || !result.success)
      throw new Error(result?.error?.message || `HTTP ${response.status}`);
    return result.data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Tempo de conexão esgotado');
    if (e instanceof TypeError)
      throw new Error(
        `Não foi possível conectar à API (${ROOT}). Confira o IP e o servidor.`,
      );
    throw e;
  } finally {
    clearTimeout(t);
  }
}
export const apiRoot = ROOT;
