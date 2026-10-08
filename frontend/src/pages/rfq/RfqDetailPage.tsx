import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Quotation, type RfqDetail } from "../../api";
import { useAuth } from "../../auth";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorNote, Input, LoadingBlock, PageHeader, StatusBadge, useToast } from "../../components/ui";
import { cx, dateShort, errorMessage, money, qty } from "../../lib/format";

/** Shared RFQ page: customers compare & select quotations, vendors submit one. */
export default function RfqDetailPage() {
  const { rfqId = "" } = useParams();
  const { data: rfq, isLoading, error } = useQuery({ queryKey: ["rfq", rfqId], queryFn: () => api.rfq(rfqId) });
  if (isLoading) return <LoadingBlock />;
  if (error || !rfq) return <ErrorNote error={error ?? new Error("RFQ not found")} />;
  return rfq.viewer === "customer" ? <CustomerView rfq={rfq} /> : <VendorView rfq={rfq} />;
}

function Header({ rfq, back }: { rfq: RfqDetail; back: { to: string; label: string } }) {
  return (
    <>
      <Link to={back.to} className="label-caps mb-3 inline-block hover:text-ink">
        ← {back.label}
      </Link>
      <PageHeader
        eyebrow={`RFQ #${rfq.id.slice(0, 8)}`}
        title={rfq.project.name}
        description={[rfq.project.location, rfq.deadline ? `Deadline ${dateShort(rfq.deadline)}` : null].filter(Boolean).join(" · ") || undefined}
        actions={<StatusBadge status={rfq.status} />}
      />
    </>
  );
}

function CustomerView({ rfq }: { rfq: RfqDetail }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirm, setConfirm] = useState<string | null>(null);
  const select = useMutation({
    mutationFn: (id: string) => api.selectQuotation(id),
    onSuccess: () => {
      toast.success("Quotation selected — vendors have been notified");
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["rfq", rfq.id] });
      qc.invalidateQueries({ queryKey: ["rfqs"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const closed = rfq.status === "closed";
  const lowest = rfq.lowest_total !== null ? Number(rfq.lowest_total) : null;
  const lineKey = (q: Quotation, lineId: string) => q.lines.find((l) => l.rfq_line_item_id === lineId);

  return (
    <>
      <Header rfq={rfq} back={{ to: `/projects/${rfq.project.id}/rfqs`, label: "All RFQs" }} />
      <ErrorNote error={select.error} />

      <Card className="mb-6">
        <CardHeader title="Invited vendors" description={`${rfq.vendors.length} invited · ${rfq.quotations.length} responded`} />
        <div className="flex flex-wrap gap-2">
          {rfq.vendors.map((v) => (
            <Badge key={v.id} tone={rfq.quotations.some((q) => q.vendor_id === v.id) ? "success" : "neutral"}>
              {v.company_name}
            </Badge>
          ))}
        </div>
      </Card>

      {rfq.quotations.length === 0 ? (
        <EmptyState pattern="arcs" title="Waiting for quotations" description="Vendors have been notified. You'll get a notification when the first quote arrives." />
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-soft">
                <th className="label-caps px-4 py-3">Item</th>
                <th className="label-caps px-4 py-3 text-right">Qty</th>
                {rfq.quotations.map((q) => (
                  <th key={q.id} className="px-4 py-3 text-right align-bottom">
                    <p className="text-xs font-bold text-ink">{q.company_name}</p>
                    <StatusBadge status={q.status} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rfq.lines.map((line) => (
                <tr key={line.id} className="border-b border-line">
                  <td className="px-4 py-3 font-bold">{line.item_name ?? "Item"}</td>
                  <td className="px-4 py-3 text-right text-muted">
                    {qty(line.requested_quantity)} {line.unit ?? ""}
                  </td>
                  {rfq.quotations.map((q) => {
                    const l = lineKey(q, line.id);
                    return (
                      <td key={q.id} className="px-4 py-3 text-right">
                        {l ? (
                          <>
                            <p>{money(l.line_total, q.currency)}</p>
                            <p className="text-[10px] text-subtle">
                              @ {money(l.unit_price, q.currency)} {l.lead_time ? `· ${l.lead_time}` : ""}
                            </p>
                          </>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-soft">
                <td className="px-4 py-4 font-bold" colSpan={2}>
                  Total
                </td>
                {rfq.quotations.map((q) => (
                  <td key={q.id} className="px-4 py-4 text-right">
                    <p className={cx("text-sm font-bold", lowest !== null && Number(q.total_price) === lowest && "text-success")}>{money(q.total_price, q.currency)}</p>
                    {lowest !== null && Number(q.total_price) === lowest ? <Badge tone="success" className="mt-1">Lowest</Badge> : null}
                  </td>
                ))}
              </tr>
              {!closed ? (
                <tr>
                  <td colSpan={2} />
                  {rfq.quotations.map((q) => (
                    <td key={q.id} className="px-4 py-4 text-right">
                      {confirm === q.id ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" loading={select.isPending} onClick={() => select.mutate(q.id)}>
                            Confirm
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setConfirm(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => setConfirm(q.id)}>
                          Select
                        </Button>
                      )}
                    </td>
                  ))}
                </tr>
              ) : null}
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}

function VendorView({ rfq }: { rfq: RfqDetail }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const mine = rfq.quotations[0];
  const closed = rfq.status === "closed";
  const [rows, setRows] = useState<Record<string, { unit_price: string; quantity: string; lead_time: string }>>({});

  useEffect(() => {
    const init: typeof rows = {};
    for (const line of rfq.lines) {
      const prior = mine?.lines.find((l) => l.rfq_line_item_id === line.id);
      init[line.id] = {
        unit_price: prior ? String(prior.unit_price) : "",
        quantity: prior ? String(prior.quantity) : String(line.requested_quantity),
        lead_time: prior?.lead_time ?? "",
      };
    }
    setRows(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfq.id, mine?.id]);

  const total = useMemo(() => rfq.lines.reduce((sum, l) => sum + (Number(rows[l.id]?.unit_price) || 0) * (Number(rows[l.id]?.quantity) || 0), 0), [rows, rfq.lines]);
  const ready = rfq.lines.every((l) => Number(rows[l.id]?.unit_price) > 0 && Number(rows[l.id]?.quantity) > 0);

  const submit = useMutation({
    mutationFn: () =>
      api.submitQuotation(rfq.id, {
        currency: "USD",
        lines: rfq.lines.map((l) => ({
          rfq_line_item_id: l.id,
          unit_price: Number(rows[l.id].unit_price),
          quantity: Number(rows[l.id].quantity),
          lead_time: rows[l.id].lead_time || undefined,
        })),
      }),
    onSuccess: () => {
      toast.success("Quotation submitted");
      qc.invalidateQueries({ queryKey: ["rfq", rfq.id] });
      qc.invalidateQueries({ queryKey: ["vendor"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const set = (id: string, field: "unit_price" | "quantity" | "lead_time", value: string) => setRows((r) => ({ ...r, [id]: { ...r[id], [field]: value } }));

  return (
    <>
      <Header rfq={rfq} back={{ to: user?.role === "admin" ? "/admin" : "/vendor/rfqs", label: "RFQ inbox" }} />
      {mine ? (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label-caps">Your quotation</p>
            <p className="mt-1 text-lg font-bold text-ink">{money(mine.total_price, mine.currency)}</p>
          </div>
          <StatusBadge status={mine.status} />
        </Card>
      ) : null}
      {closed ? <p className="mb-4 rounded-ui border border-line bg-soft px-4 py-3 text-xs text-muted">This RFQ is closed. Quotations can no longer be changed.</p> : null}

      <Card padded={false} className="overflow-hidden">
        <div className="hidden grid-cols-[1.6fr_0.8fr_1fr_1fr_1fr] gap-3 border-b border-line bg-soft px-5 py-3 md:grid">
          {["Item", "Requested", "Unit price (USD)", "Quantity", "Lead time"].map((h) => (
            <span key={h} className="label-caps">
              {h}
            </span>
          ))}
        </div>
        <ul className="divide-y divide-line">
          {rfq.lines.map((line) => (
            <li key={line.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.6fr_0.8fr_1fr_1fr_1fr] md:items-center">
              <div>
                <p className="text-xs font-bold text-ink">{line.item_name}</p>
                <p className="text-[11px] text-muted">{line.category ?? ""}</p>
              </div>
              <p className="text-xs text-muted">
                {qty(line.requested_quantity)} {line.unit ?? ""}
              </p>
              <Input aria-label={`Unit price for ${line.item_name}`} type="number" min="0" step="0.01" disabled={closed} value={rows[line.id]?.unit_price ?? ""} onChange={(e) => set(line.id, "unit_price", e.target.value)} />
              <Input aria-label={`Quantity for ${line.item_name}`} type="number" min="0" step="any" disabled={closed} value={rows[line.id]?.quantity ?? ""} onChange={(e) => set(line.id, "quantity", e.target.value)} />
              <Input aria-label={`Lead time for ${line.item_name}`} placeholder="e.g. 5 days" disabled={closed} value={rows[line.id]?.lead_time ?? ""} onChange={(e) => set(line.id, "lead_time", e.target.value)} />
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-soft px-5 py-4">
          <div>
            <p className="label-caps">Quotation total</p>
            <p className="text-lg font-bold text-ink">{money(total)}</p>
          </div>
          <Button size="lg" disabled={closed || !ready} loading={submit.isPending} onClick={() => submit.mutate()}>
            {mine ? "Update quotation" : "Submit quotation"}
          </Button>
        </div>
      </Card>
      <div className="mt-4">
        <ErrorNote error={submit.error} />
      </div>
    </>
  );
}
