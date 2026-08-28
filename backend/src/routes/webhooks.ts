import { Router, Request, Response } from "express";

export const webhooksRouter = Router();

/**
 * POST /api/webhooks/sent
 * Inbound webhook receiver for Sent.dm delivery receipts & status callbacks
 */
webhooksRouter.post("/sent", (req: Request, res: Response) => {
  const signature = req.headers["x-sent-signature"] || req.headers["x-webhook-signature"];
  const event = req.body;

  console.log("[Webhook][Sent.dm] Inbound event received:", event);

  // Acknowledge receipt immediately (200 OK)
  return res.status(200).json({ received: true, timestamp: new Date().toISOString() });
});

/**
 * POST /api/webhooks/twilio
 * Twilio status callback webhook
 */
webhooksRouter.post("/twilio", (req: Request, res: Response) => {
  console.log("[Webhook][Twilio] Callback:", req.body);
  return res.status(200).send("<Response></Response>");
});

/**
 * POST /api/webhooks/termii
 * Termii delivery callback webhook
 */
webhooksRouter.post("/termii", (req: Request, res: Response) => {
  console.log("[Webhook][Termii] Callback:", req.body);
  return res.status(200).json({ status: "success" });
});
