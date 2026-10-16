import { NamiyaExperience } from "@/components/NamiyaExperience";

export default async function ShopPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  return <NamiyaExperience key={shopId} initialShopId={shopId} />;
}
