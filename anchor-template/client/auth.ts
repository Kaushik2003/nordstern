import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Seeded operator console users:
        const users = [
          { id: "1", name: "Ananya Rao", email: "ananya@nordstern.live", role: "Compliance_Officer", password: "password123" },
          { id: "2", name: "Dev Kapoor", email: "dev@nordstern.live", role: "Developer", password: "password123" },
          { id: "3", name: "Kavya Nair", email: "kavya@nordstern.live", role: "Operator", password: "password123" },
          { id: "4", name: "Kaushik", email: "kaushik@nordstern.live", role: "Owner", password: "password123" }
        ];

        const user = users.find(
          (u) =>
            u.email === credentials?.username &&
            u.password === credentials?.password
        );

        if (user) {
          // Return user object without password
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET ?? "super-secret-development-key-12345",
});
