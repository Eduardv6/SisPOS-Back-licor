// Script to add default "Unidad" presentation to all existing products that don't have one
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function seedPresentaciones() {
  try {
    // Get all active products
    const products = await prisma.producto.findMany({
      where: { activo: true },
      include: { presentaciones: true },
    });

    let created = 0;
    for (const product of products) {
      // Skip if already has presentations
      if (product.presentaciones.length > 0) continue;

      await prisma.presentacion.create({
        data: {
          productoId: product.id,
          nombre: "Unidad",
          cantidadBase: 1,
          precioVenta: product.precioVenta,
          esDefault: true,
        },
      });
      created++;
      console.log(`✅ Created default presentation for: ${product.nombre}`);
    }

    console.log(
      `\nDone! Created ${created} default presentations for ${products.length} products.`,
    );
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedPresentaciones();
