import { Router } from "express";
import { prisma } from "../prisma";

export const router = Router();

router.get("/low-stock-alerts", async (req, res) => {
  const processedParam = (req.query.processed as string) ?? undefined;
  const processed = processedParam === undefined ? undefined : processedParam === "true";
  const alerts = await prisma.lowStockAlert.findMany({
    where: processed === undefined ? {} : { processed },
    orderBy: { createdAt: "desc" },
    include: { product: true },
  });
  res.json(
    (alerts as any[]).map((a: any) => ({
      id: a.id,
      productId: a.productId,
      sku: a.product.sku,
      name: a.product.name,
      stock: a.stock,
      threshold: a.threshold,
      processed: a.processed,
      createdAt: a.createdAt,
    }))
  );
});

router.post("/low-stock-alerts/:id/ack", async (req, res) => {
  const id = req.params.id;
  await prisma.lowStockAlert.update({ where: { id }, data: { processed: true } });
  res.json({ ok: true });
});
