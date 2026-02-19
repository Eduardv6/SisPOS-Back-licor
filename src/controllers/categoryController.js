import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.categoria.findMany({
      where: {
        parentId: null,
      },
      include: {
        subcategorias: {},
      },
    });
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener categorías" });
  }
};

export const getCategory = async (req, res) => {
  try {
    const category = await prisma.categoria.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        subcategorias: true,
      },
    });

    if (!category)
      return res.status(404).json({ message: "Categoría no encontrada" });

    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener la categoría" });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { nombre, color, icono, parentId } = req.body;

    const newCategory = await prisma.categoria.create({
      data: {
        nombre,
        color,
        icono,
        parentId: parentId ? parseInt(parentId) : null,
      },
    });

    res.json(newCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear la categoría" });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { nombre, color, icono, parentId, activo } = req.body;

    const updatedCategory = await prisma.categoria.update({
      where: { id: parseInt(req.params.id) },
      data: {
        nombre,
        color,
        icono,
        parentId: parentId ? parseInt(parentId) : null,
        activo: activo !== undefined ? activo : undefined,
      },
    });

    res.json(updatedCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar la categoría" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    // Soft delete (desactivar en lugar de borrar físicamente)
    const deletedCategory = await prisma.categoria.update({
      where: { id: parseInt(req.params.id) },
      data: { activo: false },
    });

    res.json({ message: "Categoría eliminada (archivada)" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar la categoría" });
  }
};
