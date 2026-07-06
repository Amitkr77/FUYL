// (shop) layout — inherits root layout (header, footer, cart)
// Can add shop-specific providers here if needed (e.g. recently viewed)
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
