import { Outlet } from "react-router-dom";
import { Card, ErrorNote, Hero, LoadingBlock } from "../../components/ui";
import { useVendor } from "./useVendor";
import VendorProfileForm from "./VendorProfileForm";

/** Vendors must finish onboarding before using the portal. */
export default function VendorGate() {
  const { vendor, isLoading, error } = useVendor();
  if (isLoading) return <LoadingBlock />;
  if (error) return <ErrorNote error={error} />;
  if (!vendor)
    return (
      <>
        <Hero icon="building" eyebrow="Vendor onboarding" title="Set up your company profile" description="Tell buyers who you are. Once saved you can build a catalog, receive RFQs and send quotations." />
        <Card className="max-w-2xl">
          <VendorProfileForm vendor={null} />
        </Card>
      </>
    );
  return <Outlet />;
}
