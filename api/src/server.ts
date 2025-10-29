import "dotenv/config";
import express from "express";
import cors from "cors";
import "express-async-errors";
import { router as cartRouter } from "./routes/cart";
import { router as checkoutRouter } from "./routes/checkout";
import { router as adminRouter } from "./routes/admin";
import { router as productsRouter } from "./routes/products";

const app = express();
app.use(cors());
app.use(express.json());

// Mock auth via header
app.use((req, _res, next) => {
  const userId = (req.headers["x-user-id"] as string) || "demo-user";
  (req as any).userId = userId;
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/cart", cartRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/admin", adminRouter);
app.use("/api/products", productsRouter);

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  if (err?.status && err?.message) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "internal_error" });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

export default app;
