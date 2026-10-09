import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, type AdminRate } from "../../api";
import { Button, DataTable, EmptyState, EntityCell, ErrorNote, Input, LoadingBlock, Modal, PageHeader, SearchInput, useToast, type Column } from "../../components/ui";
import { dateShort, errorMessage, money } from "../../lib/format";
import { categoryVisual } from "../../lib/visuals";

export default function AdminRates() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminRate | null>(null);
  const [rate, setRate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const { data = [], isLoading, error } = useQuery({ queryKey: ["admin", "rates"], queryFn: api.adminRates });

  const save = useMutation({
    mutationFn: () => api.adminUpdateRate(editing!.id, { unit_rate: Number(rate), currency }),
    onSuccess: () => {
      toast.success("Rate saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "rates"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((r) => !term || r.item_name.toLowerCase().includes(term) || r.category.toLowerCase().includes(term));
  }, [data, search]);

  function edit(r: AdminRate) {
    setEditing(r);
    setRate(String(r.unit_rate));
    setCurrency(r.currency);
  }

  const columns: Column<AdminRate>[] = [
    {
      key: "item",
      header: "Item",
      render: (r) => {
        const v = categoryVisual(r.category || r.item_name);
        return <EntityCell icon={v.icon} tone={v.tone} title={r.item_name} subtitle={r.category} />;
      },
    },
    { key: "unit", header: "Unit", render: (r) => r.unit },
    { key: "formula", header: "Formula", render: (r) => <span className="text-muted">{r.default_formula}</span> },
    { key: "rate", header: "Unit rate", align: "right", render: (r) => <span className="font-semibold">{money(r.unit_rate, r.currency)}</span> },
    { key: "date", header: "Effective", render: (r) => <span className="text-muted">{dateShort(r.effective_date)}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <Button size="sm" variant="secondary" icon="edit" onClick={() => edit(r)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        icon="calculator"
        tone="violet"
        title="Reference rates"
        description="Deterministic unit rates used by the cost calculator. Changes are audit-logged."
        actions={<SearchInput className="w-full sm:w-80" value={search} onChange={setSearch} placeholder="Search item or category" />}
      />
      <ErrorNote error={error} />
      {isLoading ? <LoadingBlock /> : <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} empty={<EmptyState icon="calculator" tone="violet" title="No reference rates" description="Seed reference data via Alembic migration 0003, or add rates manually." />} />}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit rate · ${editing.item_name}` : "Edit rate"}
        description="Changes are written to the audit log and used by the cost calculator."
        icon="calculator"
        tone="violet"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={save.isPending} disabled={!rate || Number(rate) < 0} onClick={() => save.mutate()}>
              Save rate
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={`Unit rate (per ${editing?.unit ?? "unit"})`} type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
          <Input label="Currency" maxLength={8} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
        </div>
      </Modal>
    </>
  );
}
