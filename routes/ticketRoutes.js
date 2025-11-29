// routes/ticketRoutes.js

import express from "express";
import multer from "multer";

import {
    getAllTickets,
    getTicketById,
    createTicket
} from "../controllers/ticketController.js";

const router = express.Router();

// Multer
const upload = multer({ storage: multer.memoryStorage() });

// GET all
router.get("/issues", getAllTickets);

// GET one
router.get("/issues/:id", getTicketById);

// POST create ticket
router.post("/issues", upload.single("attachment"), createTicket);

export default router;
