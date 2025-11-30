// routes/ticketRoutes.js

import express from "express";
import multer from "multer";

import {
    getAllTickets,
    getTicketById,
    createTicket,
     updateTicket, 
     deleteTicket 
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

// for update
router.put("/tickets/:id", updateTicket);

// for delete

router.delete("/tickets/:id", deleteTicket);

export default router;
