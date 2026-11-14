import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { trustedOrigins } from '@/lib/deployment';
export class ApiError extends Error {
    constructor(message: string, public status = 400) {
        super(message);
    }
}
export async function requireUser() {
    const session = await auth();
    if (!session?.user?.id)
        throw new ApiError('Please log in to continue.', 401);
    return session.user.id;
}
export function checkOrigin(request: Request) {
    const origin = request.headers.get('origin');
    if (!origin || !trustedOrigins(request.url).includes(origin))
        throw new ApiError('This request could not be verified. Refresh and try again.', 403);
    if (!request.headers.get('content-type')?.includes('application/json'))
        throw new ApiError('Send JSON data.', 415);
}
export function apiError(error: unknown) {
    if (error instanceof ApiError)
        return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ZodError)
        return NextResponse.json({ error: error.issues[0]?.message || 'Check your information.' }, { status: 400 });
    if (error instanceof SyntaxError)
        return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    console.error('API error', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}
export async function readJson(request: Request): Promise<unknown> {
    const reader = request.body?.getReader();
    if (!reader)
        throw new ApiError("Request body is required.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        size += value.length;
        if (size > 131072) {
            await reader.cancel();
            throw new ApiError("This request is too large.", 413);
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
}
