import { Router } from "express";
import { prisma } from "../prisma";
import { z } from "zod";

export const router = Router();

const reserveSchema = z.object({
  address: z.string().min(5),
  shippingMethod: z.string().min(2),
});

router.post("/reserve", async (req, res) => {
  const userId = (req as any).userId as string;
  const { address, shippingMethod } = reserveSchema.parse(req.body);

  // Load cart
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });
  if (!cart || (cart.items as any[]).length === 0) {
    return res.status(400).json({ error: "cart_empty" });
  }

  // Validate stock at reservation time
  for (const item of cart.items as any[]) {
    if (item.qty > item.product.stock) {
      return res.status(409).json({ error: `insufficient_stock:${item.productId}` });
    }
  }

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Create reservation with snapshot of items
  const reservation = await prisma.reservation.create({
    data: {
      userId,
      address,
      shipping: shippingMethod,
      expiresAt,
      items: {
        create: (cart.items as any[]).map((ci: any) => ({
          productId: ci.productId,
          productName: ci.product.name,
          price: ci.product.price,
          qty: ci.qty,
        })),
      },
    },
    include: { items: true },
  });

  res.json({ reservationId: reservation.id, expiresAt });
});

const confirmSchema = z.object({ reservationId: z.string() });

router.post("/confirm", async (req, res) => {
  const userId = (req as any).userId as string;
  const { reservationId } = confirmSchema.parse(req.body);

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { items: true, order: true },
  });
  if (!reservation || reservation.userId !== userId) {
    return res.status(400).json({ error: "invalid_reservation" });
  }
  if (reservation.status !== "ACTIVE") {
    // idempotent: if already consumed, return the order
    if (reservation.status === "CONSUMED" && reservation.order) {
      return res.json({ orderId: reservation.order.id, status: "created" });
    }
    return res.status(400).json({ error: "reservation_inactive" });
  }
  if (reservation.expiresAt.getTime() < Date.now()) {
    return res.status(410).json({ error: "reservation_expired" });
  }

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      
      const productIds = (reservation.items as any[]).map((i: any) => i.productId);
      
      const locked = (await tx.$queryRawUnsafe(
        `SELECT id, stock, "lowStockThreshold" FROM "Product" WHERE id = ANY($1) FOR UPDATE`,
        productIds
      )) as Array<{ id: string; stock: number; lowStockThreshold: number }>;
      const idToStock = new Map<string, { stock: number; low: number }>();
      (locked as any[]).forEach((row: any) => idToStock.set(row.id, { stock: row.stock, low: row.lowStockThreshold }));

      // Validate stock
      for (const item of reservation.items as any[]) {
        const s = idToStock.get(item.productId)?.stock ?? 0;
        if (s < item.qty) {
          const e: any = new Error(`insufficient_stock:${item.productId}`);
          e.status = 409;
          throw e;
        }
      }

      // Decrement stock
      for (const item of reservation.items as any[]) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty } },
        });
      }

      // Create order and items
      const order = await tx.order.create({
        data: {
          userId,
          reservationId: reservation.id,
          items: {
            create: (reservation.items as any[]).map((ri: any) => ({
              productId: ri.productId,
              price: ri.price,
              qty: ri.qty,
            })),
          },
        },
      });

      // Mark reservation consumed
      await tx.reservation.update({ where: { id: reservation.id }, data: { status: "CONSUMED" } });

      // Clear cart
      const cart = await tx.cart.findUnique({ where: { userId } });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      // Emit low-stock alerts
      const updatedProducts = await tx.product.findMany({ where: { id: { in: productIds } } });
      const alertsToCreate = (updatedProducts as any[])
        .filter((p: any) => p.stock < p.lowStockThreshold)
        .map((p: any) => ({ productId: p.id, stock: p.stock, threshold: p.lowStockThreshold }));
      if (alertsToCreate.length > 0) {
        await tx.lowStockAlert.createMany({ data: alertsToCreate });
      }

      return order;
    });

    res.json({ orderId: result.id, status: "created" });
  } catch (err: any) {
    if (err?.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  }
});
