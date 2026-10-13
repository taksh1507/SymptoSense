import { InputError } from './assessment/contracts';
export async function readJson(req: Request, maxBytes = 32000): Promise<unknown> {
  const length = Number(req.headers.get('content-length') ?? 0);
  if (length > maxBytes) throw new InputError('Request too large');
  if (!req.body) throw new InputError('JSON body required');
  const reader = req.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
  try { while (true) { const next = await reader.read(); if (next.done) break; bytes += next.value.byteLength; if (bytes > maxBytes) { await reader.cancel(); throw new InputError('Request too large'); } chunks.push(next.value); } }
  finally { reader.releaseLock(); }
  const buffer = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(buffer)); } catch { throw new InputError('Invalid JSON'); }
}

export async function readMultipart(req: Request, maxBytes: number): Promise<FormData> {
  if (Number(req.headers.get('content-length') ?? 0) > maxBytes || !req.body) throw new InputError('Audio request too large');
  const reader = req.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
  try { while (true) { const next = await reader.read(); if (next.done) break; bytes += next.value.byteLength; if (bytes > maxBytes) { await reader.cancel(); throw new InputError('Audio request too large'); } chunks.push(next.value); } }
  finally { reader.releaseLock(); }
  const combined = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
  try { return await new Response(combined, { headers: { 'Content-Type': req.headers.get('content-type') ?? '' } }).formData(); } catch { throw new InputError('Invalid multipart request'); }
}
