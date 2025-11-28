import express from "express";
import {
    addTicketComment,
    getTicketComments
} from "../controllers/ticketCommentController.js";

const router = express.Router();

// Add comment
router.post("/ticket-comments", addTicketComment);

// Get all comments for one ticket
router.get("/ticket-comments/:ticketId", getTicketComments);

export default router;
