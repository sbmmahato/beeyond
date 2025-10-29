import "dotenv/config";
import { prisma } from "./prisma";

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const categories = ["Phones", "Laptops", "Audio", "Gaming", "Home", "Wearables"];
const brands = ["Acme", "Globex", "Soylent", "Initech", "Umbrella", "Vandelay", "Hooli", "Stark", "Wayne", "Wonka"];

async function main() {
  console.log("Seeding products...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservationItem.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.lowStockAlert.deleteMany();
  await prisma.product.deleteMany();

  const products = [] as { name: string; sku: string; price: number; stock: number; lowStockThreshold: number; image?: string }[];

  for (let i = 0; i < 150; i++) {
    const brand = brands[i % brands.length];
    const cat = categories[i % categories.length];
    const price = randInt(199, 19999);
    const stock = randInt(0, 150);
    const low = randInt(5, 15);
    const name = `${brand} ${cat} Item ${i + 1}`;
    const sku = `SKU-${brand.substring(0, 3).toUpperCase()}-${i + 1}`;
    const image = `https://picsum.photos/seed/${encodeURIComponent(sku)}/400/300`;
    products.push({ name, sku, price, stock, lowStockThreshold: low, image });
  }

  await prisma.product.createMany({ data: products });
  const created = await prisma.product.findMany({ take: 5 });

  // Starter cart for demo-user
  const cart = await prisma.cart.upsert({ where: { userId: "demo-user" }, update: {}, create: { userId: "demo-user" } });
  for (const p of created) {
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: p.id } },
      update: { qty: randInt(1, 3) },
      create: { cartId: cart.id, productId: p.id, qty: randInt(1, 3) },
    });
  }
  console.log("Seed complete.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
