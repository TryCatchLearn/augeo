import { notFound } from "next/navigation";
import { requireSession } from "@/features/auth/session";
import { DraftListingEditor } from "@/features/listings/components/draft-listing-editor";
import { getListingDetailForViewer } from "@/features/listings/queries";

type ListingEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ListingEditPage({
  params,
}: ListingEditPageProps) {
  const { id } = await params;
  const session = await requireSession(`/listings/${id}/edit`);
  const listing = await getListingDetailForViewer(id, session.user.id);

  if (
    !listing ||
    listing.sellerId !== session.user.id ||
    listing.status !== "draft"
  ) {
    notFound();
  }

  return <DraftListingEditor listing={listing} />;
}
