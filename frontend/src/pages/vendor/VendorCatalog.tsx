import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api, type CatalogItem } from "../../api";
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, ErrorNote, Input, LoadingBlock, Modal, PageHeader, useToast, type Column } from "../../components/ui";
import { errorMessage, money, percent, qty } from "../../lib/format";
import { useVendor } from "./useVendor";

type Draft = { id?: string; item_name: string; category: string; unit: string; unit_price: string; available_quantity: string };
const blank: Draft = { item_name: "", category: "", unit: "", unit_price: "", available_quantity: "" };

export default function VendorCatalog() {
  const { vendor } = useVendor();
  const vendorId = vendor?.id ?? "";
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data = [], isLoading, error } = useQuery({ queryKey: ["vendor", "catalog", vendorId], queryFn: () => api.vendorCatalog(vendorId), enabled: !!vendorId });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["vendor", "catalog", vendorId] });
    qc.invalidateQueries({ queryKey: ["dashboard", "vendor"] });
  };
  const onError = (e: unknown) => toast.error(errorMessage(e));

  const num = (v: string) => (v === "" ? undefined : Number(v));
  const save = useMutation({
    mutationFn: (publish: boolean) => {
      const d = draft!;
      const body = { item_name: d.item_name.trim(), category: d.category.trim() || undefined, unit: d.unit.trim() || undefined, unit_price: num(d.unit_price), available_quantity: num(d.available_quantity) };
      return d.id ? api.updateCatalogItem(d.id, body) : api.createCatalogItem(vendorId, { ...body, publish });
    },
    onSuccess: () => {
      toast.success("Catalog item saved");
      setDraft(null);
      refresh();
    },
    onError,
  });
  const publish = useMutation({ mutationFn: (i: CatalogItem) => (i.is_published ? api.unpublishCatalogItem(i.id) : api.publishCatalogItem(i.id)), onSuccess: refresh, onError });
  const remove = useMutation({
    mutationFn: (i: CatalogItem) => api.deleteCatalogItem(i.id),
    onSuccess: () => {
      toast.success("Item deleted");
      refresh();
    },
    onError,
  });
  const upload = useMutation({
    mutationFn: (file: File) => api.uploadVendorDocument(vendorId, file),
    onSuccess: () => {
      toast.success("Catalog document processed — review the extracted drafts below");
      if (fileRef.current) fileRef.current.value = "";
      refresh();
    },
    onError,
  });

  const columns: Column<CatalogItem>[] = [
    { key: "name", header: "Item", render: (i) => <span className="font-bold">{i.item_name}</span> },
    { key: "cat", header: "Category", render: (i) => <span className="text-muted">{i.category ?? "—"}</span> },
    { key: "price", header: "Unit price", align: "right", render: (i) => `${money(i.unit_price)}${i.unit ? ` / ${i.unit}` : ""}` },
    { key: "qty", header: "In stock", align: "right", render: (i) => qty(i.available_quantity) },
    { key: "conf", header: "Confidence", render: (i) => <span className="text-muted">{percent(i.confidence_score)}</span> },
    { key: "status", header: "Status", render: (i) => <Badge tone={i.is_published ? "success" : "neutral"}>{i.is_published ? "Published" : "Draft"}</Badge> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (i) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setDraft({ id: i.id, item_name: i.item_name, category: i.category ?? "", unit: i.unit ?? "", unit_price: i.unit_price?.toString() ?? "", available_quantity: i.available_quantity?.toString() ?? "" })}>
            Edit
          </Button>
          <Button size="sm" variant={i.is_published ? "ghost" : "primary"} loading={publish.isPending && publish.variables?.id === i.id} onClick={() => publish.mutate(i)}>
            {i.is_published ? "Unpublish" : "Publish"}
          </Button>
          <Button size="sm" variant="danger" onClick={() => window.confirm(`Delete "${i.item_name}"?`) && remove.mutate(i)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Vendor" title="Catalog" description="Only published items are visible in the marketplace and eligible for matching." actions={<Button onClick={() => setDraft(blank)}>Add item</Button>} />
      <Card className="mb-6">
        <CardHeader title="Import from a document" description="Upload a price list (PDF, Excel, CSV). Extracted items arrive as drafts for you to review and publish." />
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv" aria-label="Catalog document" className="min-h-[44px] max-w-full flex-1 rounded-ui border border-dashed border-line bg-soft px-3 py-2.5 text-xs text-muted file:mr-3 file:rounded-ui file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-[11px] file:font-bold file:uppercase file:text-accent-fg" />
          <Button
            variant="secondary"
            loading={upload.isPending}
            onClick={() => {
              const f = fileRef.current?.files?.[0];
              if (f) upload.mutate(f);
              else toast.info("Choose a file first");
            }}
          >
            Upload
          </Button>
        </div>
      </Card>
      <ErrorNote error={error} />
      {isLoading ? <LoadingBlock /> : <DataTable columns={columns} rows={data} rowKey={(i) => i.id} empty={<EmptyState pattern="blocks" title="Your catalog is empty" description="Add items manually or import a price list." action={<Button onClick={() => setDraft(blank)}>Add item</Button>} />} />}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit item" : "Add catalog item"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            {!draft?.id ? (
              <Button variant="secondary" loading={save.isPending} disabled={!draft?.item_name.trim()} onClick={() => save.mutate(false)}>
                Save as draft
              </Button>
            ) : null}
            <Button loading={save.isPending} disabled={!draft?.item_name.trim()} onClick={() => save.mutate(true)}>
              {draft?.id ? "Save changes" : "Save & publish"}
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="space-y-4">
            <Input label="Item name" required value={draft.item_name} onChange={(e) => setDraft({ ...draft, item_name: e.target.value })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
              <Input label="Unit" placeholder="bag, m3, kg…" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
              <Input label="Unit price (USD)" type="number" min="0" step="0.01" value={draft.unit_price} onChange={(e) => setDraft({ ...draft, unit_price: e.target.value })} />
              <Input label="Available quantity" type="number" min="0" step="any" value={draft.available_quantity} onChange={(e) => setDraft({ ...draft, available_quantity: e.target.value })} />
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
