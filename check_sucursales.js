import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const sucursales = await prisma.sucursal.findMany();
  console.log(JSON.stringify(sucursales, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
