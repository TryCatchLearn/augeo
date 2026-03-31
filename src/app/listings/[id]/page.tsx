import { notFound } from "next/navigation";
import { getSession } from "@/features/auth/session";
import { ListingDetailLiveView } from "@/features/listings/components/listing-detail-live-view";
import { getListingDetailForViewer } from "@/features/listings/queries";

type ListingDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ListingDetailPage({
  params,
}: ListingDetailPageProps) {
  const { id } = await params;
  const session = await getSession();
  const listing = await getListingDetailForViewer(id, session?.user.id);

  if (!listing) {
    notFound();
  }

  return (
    <ListingDetailLiveView
      initialListing={listing}
      viewerId={session?.user.id}
    />
  );
}
