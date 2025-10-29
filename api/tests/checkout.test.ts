import request from "supertest";
import app from "../src/server";
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/prisma";

const agent: any = (request as any)(app);

async function resetAndSeedMinimal() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservationItem.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.lowStockAlert.deleteMany();
  await prisma.product.deleteMany();

  const p1 = await prisma.product.create({
    data: { name: "Test Prod 1", sku: "TST-1", price: 1000, stock: 5, lowStockThreshold: 3 }
  });
  const p2 = await prisma.product.create({
    data: { name: "Test Prod 2", sku: "TST-2", price: 2000, stock: 0, lowStockThreshold: 2 }
  });
  return { p1, p2 };
}

beforeAll(async () => {
  await resetAndSeedMinimal();
});

describe("Cart CRUD", () => {
  it("add, update, remove; totals correct", async () => {
    const { p1 } = await resetAndSeedMinimal();
    const u = "demo-user";

    await agent.post("/api/cart").set("x-user-id", u).send({ productId: p1.id, qty: 2 }).expect(200);
    let res = await agent.get("/api/cart").set("x-user-id", u).expect(200);
    expect(res.body.total).toBe(2 * p1.price);

    await agent.patch(`/api/cart/${p1.id}`).set("x-user-id", u).send({ qty: 3 }).expect(200);
    res = await agent.get("/api/cart").set("x-user-id", u).expect(200);
    expect(res.body.total).toBe(3 * p1.price);

    await agent.delete(`/api/cart/${p1.id}`).set("x-user-id", u).expect(200);
    res = await agent.get("/api/cart").set("x-user-id", u).expect(200);
    expect(res.body.items.length).toBe(0);
  });
});

describe("Reservation", () => {
  it("reserve succeeds when stock >= qty", async () => {
    const { p1 } = await resetAndSeedMinimal();
    const u = "user-a";

    await agent.post("/api/cart").set("x-user-id", u).send({ productId: p1.id, qty: 2 }).expect(200);
    const res = await agent
      .post("/api/checkout/reserve")
      .set("x-user-id", u)
      .send({ address: "addr", shippingMethod: "standard" })
      .expect(200);
    expect(res.body.reservationId).toBeDefined();
    expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("reserve blocks if line out of stock", async () => {
    const { p2 } = await resetAndSeedMinimal();
    const u = "user-b";
    await agent.post("/api/cart").set("x-user-id", u).send({ productId: p2.id, qty: 1 }).expect(200);
    const res = await agent
      .post("/api/checkout/reserve")
      .set("x-user-id", u)
      .send({ address: "addr", shippingMethod: "standard" });
    expect(res.status).toBe(409);
  });
});

describe("Confirm & Concurrency", () => {
  it("only one confirm succeeds under contention", async () => {
    // product with stock 1
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.reservationItem.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.product.deleteMany();

    const p = await prisma.product.create({ data: { name: "OneStock", sku: "ONE-1", price: 1000, stock: 1, lowStockThreshold: 1 } });

    // two users add same product
    await agent.post("/api/cart").set("x-user-id", "u1").send({ productId: p.id, qty: 1 });
    await agent.post("/api/cart").set("x-user-id", "u2").send({ productId: p.id, qty: 1 });

    const r1 = await agent.post("/api/checkout/reserve").set("x-user-id", "u1").send({ address: "a", shippingMethod: "s" });
    const r2 = await agent.post("/api/checkout/reserve").set("x-user-id", "u2").send({ address: "a", shippingMethod: "s" });

    // both reserved (soft reserve), but only one confirm should pass due to lock+stock check
    const [c1, c2] = await Promise.all([
      agent.post("/api/checkout/confirm").set("x-user-id", "u1").send({ reservationId: r1.body.reservationId }),
      agent.post("/api/checkout/confirm").set("x-user-id", "u2").send({ reservationId: r2.body.reservationId }),
    ]);

    const okCount = [c1.status, c2.status].filter((s: number) => s === 200).length;
    const conflictCount = [c1.status, c2.status].filter((s: number) => s === 409).length;
    expect(okCount).toBe(1);
    expect(conflictCount).toBe(1);
  });

  it("idempotent confirm returns same orderId on second call", async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.reservationItem.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.product.deleteMany();

    const p = await prisma.product.create({ data: { name: "Idem", sku: "IDEM-1", price: 500, stock: 10, lowStockThreshold: 3 } });
    const u = "u3";
    await agent.post("/api/cart").set("x-user-id", u).send({ productId: p.id, qty: 2 });
    const r = await agent.post("/api/checkout/reserve").set("x-user-id", u).send({ address: "a", shippingMethod: "s" });

    const c1 = await agent.post("/api/checkout/confirm").set("x-user-id", u).send({ reservationId: r.body.reservationId });
    const c2 = await agent.post("/api/checkout/confirm").set("x-user-id", u).send({ reservationId: r.body.reservationId });

    expect(c1.status).toBe(200);
    expect(c2.status).toBe(200);
    expect(c1.body.orderId).toBe(c2.body.orderId);
  });
});

describe("Low-stock alert", () => {
  it("creates alert when stock falls below threshold", async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.reservationItem.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.lowStockAlert.deleteMany();
    await prisma.product.deleteMany();

    const p = await prisma.product.create({ data: { name: "AlertProd", sku: "ALR-1", price: 800, stock: 3, lowStockThreshold: 3 } });
    const u = "u4";
    await agent.post("/api/cart").set("x-user-id", u).send({ productId: p.id, qty: 1 });
    const r = await agent.post("/api/checkout/reserve").set("x-user-id", u).send({ address: "a", shippingMethod: "s" });
    await agent.post("/api/checkout/confirm").set("x-user-id", u).send({ reservationId: r.body.reservationId }).expect(200);

    const list = await agent.get("/api/admin/low-stock-alerts").expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBeGreaterThan(0);
  });
});
