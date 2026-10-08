import { PageHeader, Card, StatusBadge } from "../../components/ui";
import { useVendor } from "./useVendor";
import VendorProfileForm from "./VendorProfileForm";

export default function VendorProfile() {
  const { vendor } = useVendor();
  return (
    <>
      <PageHeader eyebrow="Vendor" title="Company profile" description="This information is shown on your public marketplace page." actions={vendor?.status ? <StatusBadge status={vendor.status} /> : null} />
      <Card className="max-w-2xl">
        <VendorProfileForm vendor={vendor} />
      </Card>
    </>
  );
}
