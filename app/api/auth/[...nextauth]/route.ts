import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import { compare } from "bcryptjs";

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        // Verify password
        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle OAuthAccountNotLinked — auto-link Google to existing email/password account
      if (account?.provider === 'google' && user?.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        });

        if (existingUser) {
          // Check if Google account is already linked
          const alreadyLinked = existingUser.accounts.some(
            a => a.provider === 'google'
          );

          if (!alreadyLinked && account.providerAccountId) {
            // Link the Google account to the existing user
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            });

            // Update profile image if not set
            if (!existingUser.image && profile?.image) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { image: profile.image as string },
              });
            }
          }

          // Override user.id so the JWT gets the correct existing user id
          user.id = existingUser.id;
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Always land on dashboard after any sign-in or sign-up
      if (url.includes('/auth/') || url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/dashboard`;
      }
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.userId as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? "symptosense-dev-secret-change-in-production",
});

export { handler as GET, handler as POST };
