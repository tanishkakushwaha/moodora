import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { db } from '@/lib/db';
import { loginSchema } from '@/lib/validation';
import { verifyPassword } from '@/lib/password';
import { rateLimit } from '@/lib/rate-limit';
import { usesSecureCookies } from '@/lib/deployment';
const secureSession = usesSecureCookies();
export const { handlers, auth, signIn, signOut } = NextAuth({
    cookies: { sessionToken: { name: `${secureSession ? '__Secure-' : ''}bloom.session-token`, options: { httpOnly: true, sameSite: 'lax', path: '/', secure: secureSession } } },
    session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
    pages: { signIn: '/login' },
    providers: [Credentials({ credentials: { email: { type: 'email' }, password: { type: 'password' } }, async authorize(credentials) {
                const parsed = loginSchema.safeParse(credentials);
                if (!parsed.success)
                    return null;
                if (!await rateLimit(`login:${parsed.data.email}`, 10))
                    return null;
                const user = await db.user.findUnique({ where: { email: parsed.data.email } });
                // Equalize expensive password work for unknown accounts.
                const dummy = 'scrypt:00000000000000000000000000000000:' + '00'.repeat(64);
                const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? dummy);
                if (!user || !user.passwordHash || !valid)
                    return null;
                return { id: user.id, name: user.name, email: user.email, image: user.image, sessionVersion: user.sessionVersion };
            } }), ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })] : [])],
    callbacks: {
        async signIn({ account, profile }) {
            if (account?.provider === 'google') {
                if (profile?.email_verified !== true || !profile.email)
                    return false;
                const existing = await db.user.findUnique({ where: { email: profile.email.toLowerCase() } });
                if (existing?.passwordHash)
                    return '/login?error=GoogleAccountNotLinked';
            }
            return true;
        },
        async jwt({ token, user, account }) {
            if (user && account?.provider === 'google') {
                const record = await db.user.upsert({ where: { email: user.email!.toLowerCase() }, create: { email: user.email!.toLowerCase(), name: user.name || 'Friend', image: user.image }, update: {} });
                token.sub = record.id;
                token.version = record.sessionVersion;
            }
            else if (user) {
                token.sub = user.id;
                token.version = user.sessionVersion;
            }
            return token;
        },
        async session({ session, token }) {
            if (token.sub) {
                const user = await db.user.findUnique({ where: { id: token.sub }, select: { id: true, name: true, email: true, image: true, sessionVersion: true } });
                if (user && user.sessionVersion === token.version) {
                    session.user = { ...session.user, id: user.id, name: user.name, email: user.email, image: user.image };
                }
                else {
                    session.user.id = '';
                }
            }
            return session;
        },
    },
});
