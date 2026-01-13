import express from "express";
import { createContactElite } from "../controllers/contact.controller.js"; 

const router = express.Router();

// Validación del ID (por si luego agregas rutas con :id)
router.param("id", (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({
      status: "error",
      message: "ID no válido.",
    });
  }
  next();
});

// Ruta para crear contacto
router.post("/", createContactElite);

export default router;
