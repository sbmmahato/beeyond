interface Props { params: { id: string } }
export default function OrderPage({ params }: Props) {
  return (
    <main>
      <h1>Order Confirmed</h1>
      <p>Your order id is:</p>
      <pre>{params.id}</pre>
      <a href="/">Back to home</a>
    </main>
  );
}
