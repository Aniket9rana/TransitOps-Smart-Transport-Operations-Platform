import "dotenv/config";
import { SignJWT } from "jose";
import { prisma } from "./lib/prisma";
import { getInitials } from "./lib/format";

async function main() {
  const role = process.argv[2] ?? "FLEET_MANAGER";
  const user = await prisma.user.findFirst({ where: { role: role as never } });
  if (!user) throw new Error("no user for role " + role);
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const token = await new SignJWT({
    userId: user.id,
    role: user.role,
    name: user.name,
    initials: getInitials(user.name),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
  console.log(token);
}

main().finally(() => prisma.$disconnect());
