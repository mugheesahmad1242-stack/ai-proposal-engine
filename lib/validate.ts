import { NextResponse } from 'next/server';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';

export async function parseJson<T>(req: Request, schema: ZodSchema<T>): Promise<{ data: T; error?: undefined } | { data?: undefined; error: NextResponse }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { error: NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 }) };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    const message = result.error instanceof ZodError ? result.error.issues.map(e => `${e.path.join('.') || 'body'}: ${e.message}`).join('; ') : 'Invalid request body';
    return { error: NextResponse.json({ error: message }, { status: 400 }) };
  }
  return { data: result.data };
}
