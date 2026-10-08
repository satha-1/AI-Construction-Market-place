import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { api, type Vendor } from "../../api";
import { Button, ErrorNote, Input, Textarea, useToast } from "../../components/ui";
import { errorMessage } from "../../lib/format";

type Form = { company_name: string; category: string; location: string; description: string; contact_email: string; phone: string; website: string };
const blank: Form = { company_name: "", category: "", location: "", description: "", contact_email: "", phone: "", website: "" };

/** Used for both onboarding (no vendor) and editing the company profile. */
export default function VendorProfileForm({ vendor, onSaved }: { vendor: Vendor | null; onSaved?: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState<Form>(blank);

  useEffect(() => {
    if (vendor)
      setForm({
        company_name: vendor.company_name,
        category: vendor.category ?? "",
        location: vendor.location ?? "",
        description: vendor.description ?? "",
        contact_email: vendor.contact_email ?? "",
        phone: vendor.phone ?? "",
        website: vendor.website ?? "",
      });
  }, [vendor]);

  const save = useMutation({
    mutationFn: () => {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as Form;
      if (vendor) return api.updateVendor(vendor.id, payload);
      const create = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== "")) as Form;
      return api.createVendor(create);
    },
    onSuccess: () => {
      toast.success(vendor ? "Profile updated" : "Vendor profile created");
      qc.invalidateQueries({ queryKey: ["vendor"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onSaved?.();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const field = (key: keyof Form) => ({ value: form[key], onChange: (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value }) });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (form.company_name.trim()) save.mutate();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="Company name" required {...field("company_name")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Primary category" placeholder="e.g. Cement, Steel, Electrical" {...field("category")} />
        <Input label="Location" placeholder="City, Country" {...field("location")} />
        <Input label="Contact email" type="email" {...field("contact_email")} />
        <Input label="Phone" {...field("phone")} />
      </div>
      <Input label="Website" type="url" placeholder="https://" {...field("website")} />
      <Textarea label="About the company" {...field("description")} />
      <ErrorNote error={save.error} />
      <Button type="submit" loading={save.isPending} disabled={!form.company_name.trim()}>
        {vendor ? "Save changes" : "Create vendor profile"}
      </Button>
    </form>
  );
}
