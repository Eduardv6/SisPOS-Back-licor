import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const products = await prisma.producto.count();
    const categories = await prisma.categoria.count();
    const inventories = await prisma.inventario.count();
    const activeProducts = await prisma.producto.count({
      where: { activo: true },
    });

    console.log("DB Status:");
    console.log(`- Categories: ${categories}`);
    console.log(`- Products: ${products}`);
    console.log(`- Active Products: ${activeProducts}`);
    console.log(`- Inventories: ${inventories}`);

    if (products > 0) {
      const sample = await prisma.producto.findFirst({
        include: { inventarios: true },
      });
      console.log("Sample Product:", JSON.stringify(sample, null, 2));
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
