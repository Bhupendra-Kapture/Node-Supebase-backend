import express from "express";
import {
    addTicketComment,
    getTicketComments,
    deleteTicketComment,
    updateTicketComment
} from "../controllers/ticketCommentController.js";

const router = express.Router();

router.post("/ticket-comments", addTicketComment);
router.get("/ticket-comments/:ticketId", getTicketComments);
router.delete("/ticket-comments/:commentId", deleteTicketComment);
router.put("/ticket-comments/:commentId", updateTicketComment);   // <-- NEW

export default router;
