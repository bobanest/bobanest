import crypto from 'crypto';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

function safeEqual(a, b) {
  const left = crypto.createHash('sha256').update(String(a)).digest();
  const right = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
}

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminEmail || !adminPassword || !credentials) return null;

        const emailOk = safeEqual(String(credentials.email || '').trim().toLowerCase(), adminEmail.trim().toLowerCase());
        const passwordOk = safeEqual(credentials.password || '', adminPassword);
        if (emailOk && passwordOk) {
          return { id: '1', name: 'Admin', email: adminEmail };
        }
        return null;
      }
    })
  ],
  session: { strategy: 'jwt', maxAge: 12 * 60 * 60 },
  pages: { signIn: '/admin/login' },
  secret: process.env.NEXTAUTH_SECRET,
});