export const validateSchema = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error.errors) {
      return res.status(400).json({
        success: false,
        message: "Error de validación",
        errors: error.errors.map((e) => ({
          field: e.path[0],
          message: e.message,
        })),
      });
    }
    next(error);
  }
};
