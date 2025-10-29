import { Router } from "express";
import { prisma } from "../prisma";

export const router = Router();

router.get("/", async (req, res) => {
  const take = Math.min(Number(req.query.limit ?? 20), 50);
  const skip = Math.max(Number(req.query.offset ?? 0), 0);
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, sku: true, price: true, stock: true, image: true },
    }),
    prisma.product.count(),
  ]);
  res.json({ items, total, limit: take, offset: skip });
});
