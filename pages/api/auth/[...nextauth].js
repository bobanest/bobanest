import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (credentials.email === 'admin@bobanest.com' && credentials.password === 'password123') {
          return { id: '1', name: 'Admin', email: 'admin@bobanest.com' };
        }
        return null;
      }
    })
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/login' },
  secret: process.env.NEXTAUTH_SECRET,
});