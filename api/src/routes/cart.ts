import { Router } from "express";
import { prisma } from "../prisma";
import { z } from "zod";

export const router = Router();

const upsertSchema = z.object({
  productId: z.string(),
  qty: z.number().int().min(1).max(5),
});

router.get("/", async (req, res) => {
  const userId = (req as any).userId as string;
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId } });
    cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
  }
  const items = (cart?.items || []).map((ci: any) => ({
    productId: ci.productId,
    name: ci.product.name,
    price: ci.product.price,
    stock: ci.product.stock,
    qty: ci.qty,
  }));
  const total = items.reduce((s: number, i: any) => s + i.price * i.qty, 0);
  res.json({ items, total });
});

router.post("/", async (req, res) => {
  const userId = (req as any).userId as string;
  const body = upsertSchema.parse(req.body);

  const cart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  // validate product exists
  const product = await prisma.product.findUnique({ where: { id: body.productId } });
  if (!product) return res.status(400).json({ error: "invalid_product" });

  const item = await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId: body.productId } },
    update: { qty: body.qty },
    create: { cartId: cart.id, productId: body.productId, qty: body.qty },
    include: { product: true },
  });
  res.json({ ok: true, item: { productId: item.productId, qty: item.qty } });
});

router.patch("/:productId", async (req, res) => {
  const userId = (req as any).userId as string;
  const body = z.object({ qty: z.number().int().min(1).max(5) }).parse(req.body);
  const productId = req.params.productId;

  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return res.status(400).json({ error: "cart_not_found" });

  const item = await prisma.cartItem.update({
    where: { cartId_productId: { cartId: cart.id, productId } },
    data: { qty: body.qty },
  });
  res.json({ ok: true, item: { productId: item.productId, qty: item.qty } });
});

router.delete("/:productId", async (req, res) => {
  const userId = (req as any).userId as string;
  const productId = req.params.productId;
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return res.status(400).json({ error: "cart_not_found" });

  await prisma.cartItem.delete({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });
  res.json({ ok: true });
});
