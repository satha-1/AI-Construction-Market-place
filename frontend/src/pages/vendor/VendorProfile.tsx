import { ButtonLink, Card, CardHeader, PageHeader, StatusBadge } from "../../components/ui";
import { useVendor } from "./useVendor";
import VendorProfileForm from "./VendorProfileForm";

export default function VendorProfile() {
  const { vendor } = useVendor();
  return (
    <>
      <PageHeader
        icon="building"
        tone="blue"
        title="Company profile"
        description="This information is shown on your public marketplace page."
        actions={
          <>
            {vendor?.status ? <StatusBadge status={vendor.status} /> : null}
            {vendor ? (
              <ButtonLink to={`/marketplace/vendors/${vendor.id}`} variant="secondary" icon="external">
                View storefront
              </ButtonLink>
            ) : null}
          </>
        }
      />
      <Card className="max-w-3xl">
        <CardHeader icon="edit" tone="teal" title="Company details" description="Keep contact details current so customers can reach you." />
        <VendorProfileForm vendor={vendor} />
      </Card>
    </>
  );
}
