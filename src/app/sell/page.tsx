import { requireSession } from "@/features/auth/session";
import { CreateListingUpload } from "@/features/listings/components/create-listing-upload";

export default async function SellPage() {
  await requireSession("/sell");

  return (
    <section className="mx-auto flex h-full w-full max-w-7xl flex-col px-6 py-6 lg:overflow-hidden lg:py-6">
      <div className="flex flex-1 items-stretch lg:min-h-0">
        <CreateListingUpload />
      </div>
    </section>
  );
}
