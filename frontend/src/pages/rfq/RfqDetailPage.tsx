import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Quotation, type RfqDetail } from "../../api";
import { useAuth } from "../../auth";
import { Icon } from "../../components/Icon";
import { Badge, Button, Card, CardHeader, EmptyState, EntityCell, ErrorNote, IconTile, Input, LoadingBlock, PageHeader, Select, StatusBadge, Textarea, useToast } from "../../components/ui";
import { cx, dateShort, errorMessage, money, qty } from "../../lib/format";
import { categoryVisual } from "../../lib/visuals";

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
      <Link to={back.to} className="focus-ring mb-4 inline-flex items-center gap-1.5 rounded-ui text-sm font-medium text-muted transition-colors hover:text-accent">
        <Icon name="arrowLeft" className="h-4 w-4" />
        {back.label}
      </Link>
      <PageHeader
        icon="inbox"
        tone="blue"
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
  const comparison = useQuery({
    queryKey: ["rfq", rfq.id, "comparison"],
    queryFn: () => api.rfqComparison(rfq.id),
    enabled: rfq.quotations.length > 0,
  });
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

      {rfq.quotations.length > 0 ? (
        <Card className="mb-6 border-accent/20 bg-gradient-to-br from-accent-soft via-white to-sky-50">
          <CardHeader icon="sparkles" tone="violet" title="AI comparison summary" description="Deterministic ranking with a narrative for the customer" />
          {comparison.isLoading ? (
            <p className="text-sm text-muted">Generating summary…</p>
          ) : (
            <p className="text-sm leading-relaxed text-ink">{comparison.data?.summary ?? "Comparison unavailable."}</p>
          )}
        </Card>
      ) : null}

      <Card className="mb-6">
        <CardHeader icon="store" tone="blue" title="Invited vendors" description={`${rfq.vendors.length} invited · ${rfq.quotations.length} responded`} />        <div className="flex flex-wrap gap-2">
          {rfq.vendors.map((v) => {
            const responded = rfq.quotations.some((q) => q.vendor_id === v.id);
            return (
              <Badge key={v.id} tone={responded ? "success" : "neutral"} icon={responded ? "checkCircle" : "clock"}>
                {v.company_name}
              </Badge>
            );
          })}
        </div>
      </Card>

      {rfq.quotations.length === 0 ? (
        <EmptyState icon="clock" tone="amber" title="Waiting for quotations" description="Vendors have been notified. You'll get a notification when the first quote arrives." />
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-soft/70">
                <th className="px-5 py-3.5 text-xs font-semibold text-muted">Item</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-muted">Qty</th>
                {rfq.quotations.map((q) => (
                  <th key={q.id} className="px-5 py-3.5 text-right align-bottom">
                    <p className="mb-1 text-sm font-semibold text-ink">{q.company_name}</p>
                    <StatusBadge status={q.status} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rfq.lines.map((line) => (
                <tr key={line.id} className="border-b border-line">
                  <td className="px-5 py-3.5 font-medium text-ink">{line.item_name ?? "Item"}</td>
                  <td className="px-5 py-3.5 text-right text-muted">
                    {qty(line.requested_quantity)} {line.unit ?? ""}
                  </td>
                  {rfq.quotations.map((q) => {
                    const l = lineKey(q, line.id);
                    return (
                      <td key={q.id} className="px-5 py-3.5 text-right">
                        {l ? (
                          <>
                            <p className="text-ink">{money(l.line_total, q.currency)}</p>
                            <p className="text-xs text-subtle">
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
              <tr className="bg-soft/70">
                <td className="px-5 py-4 font-semibold text-ink" colSpan={2}>
                  Total
                </td>
                {rfq.quotations.map((q) => (
                  <td key={q.id} className="px-5 py-4 text-right">
                    <p className={cx("text-base font-bold text-ink", lowest !== null && Number(q.total_price) === lowest && "text-emerald-600")}>{money(q.total_price, q.currency)}</p>
                    {lowest !== null && Number(q.total_price) === lowest ? (
                      <Badge tone="success" icon="award" className="mt-1">
                        Lowest
                      </Badge>
                    ) : null}
                  </td>
                ))}
              </tr>
              {!closed ? (
                <tr>
                  <td colSpan={2} />
                  {rfq.quotations.map((q) => (
                    <td key={q.id} className="px-5 py-4 text-right">
                      {confirm === q.id ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" icon="check" loading={select.isPending} onClick={() => select.mutate(q.id)}>
                            Confirm
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setConfirm(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="soft" icon="award" onClick={() => setConfirm(q.id)}>
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
  const [currency, setCurrency] = useState(mine?.currency ?? "USD");
  const [notes, setNotes] = useState("");
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
    setCurrency(mine?.currency ?? "USD");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfq.id, mine?.id]);

  const total = useMemo(() => rfq.lines.reduce((sum, l) => sum + (Number(rows[l.id]?.unit_price) || 0) * (Number(rows[l.id]?.quantity) || 0), 0), [rows, rfq.lines]);
  const ready = rfq.lines.every((l) => Number(rows[l.id]?.unit_price) > 0 && Number(rows[l.id]?.quantity) > 0);

  const submit = useMutation({
    mutationFn: () =>
      api.submitQuotation(rfq.id, {
        currency,
        lines: rfq.lines.map((l) => ({
          rfq_line_item_id: l.id,
          unit_price: Number(rows[l.id].unit_price),
          quantity: Number(rows[l.id].quantity),
          lead_time: rows[l.id].lead_time || undefined,
          notes: notes.trim() || undefined,
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
          <div className="flex items-center gap-4">
            <IconTile icon="file" tone="teal" size="lg" />
            <div>
              <p className="text-sm font-medium text-muted">Your quotation</p>
              <p className="mt-0.5 text-xl font-bold text-ink">{money(mine.total_price, mine.currency)}</p>
            </div>
          </div>
          <StatusBadge status={mine.status} />
        </Card>
      ) : null}
      {closed ? (
        <p className="mb-4 flex items-center gap-2 rounded-ui border border-line bg-soft px-4 py-3 text-sm text-muted">
          <Icon name="alert" className="h-4 w-4 text-amber-500" />
          This RFQ is closed. Quotations can no longer be changed.
        </p>
      ) : null}

      <Card className="mb-4">
        <CardHeader icon="sliders" tone="slate" title="Quote settings" description="Currency and commercial notes applied to this submission" />
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <Select label="Currency" disabled={closed} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="LKR">LKR</option>
          </Select>
          <Textarea label="Commercial notes (optional)" disabled={closed} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, delivery window, exclusions…" />
        </div>
      </Card>

      <Card padded={false} className="overflow-hidden">
        <div className="hidden grid-cols-[1.6fr_0.8fr_1fr_1fr_1fr] gap-3 border-b border-line bg-soft px-5 py-3.5 md:grid">
          {["Item", "Requested", `Unit price (${currency})`, "Quantity", "Lead time"].map((h) => (
            <span key={h} className="text-xs font-semibold text-muted">
              {h}
            </span>
          ))}
        </div>
        <ul className="divide-y divide-line bg-white">
          {rfq.lines.map((line) => {
            const v = categoryVisual(line.category || line.item_name);
            return (
            <li key={line.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.6fr_0.8fr_1fr_1fr_1fr] md:items-center">
              <EntityCell icon={v.icon} tone={v.tone} title={line.item_name ?? "Item"} subtitle={line.category ?? undefined} />
              <p className="text-sm text-muted">
                {qty(line.requested_quantity)} {line.unit ?? ""}
              </p>
              <Input aria-label={`Unit price for ${line.item_name}`} type="number" min="0" step="0.01" disabled={closed} value={rows[line.id]?.unit_price ?? ""} onChange={(e) => set(line.id, "unit_price", e.target.value)} />
              <Input aria-label={`Quantity for ${line.item_name}`} type="number" min="0" step="any" disabled={closed} value={rows[line.id]?.quantity ?? ""} onChange={(e) => set(line.id, "quantity", e.target.value)} />
              <Input aria-label={`Lead time for ${line.item_name}`} placeholder="e.g. 5 days" disabled={closed} value={rows[line.id]?.lead_time ?? ""} onChange={(e) => set(line.id, "lead_time", e.target.value)} />
            </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-soft px-5 py-4">
          <div>
            <p className="text-sm font-medium text-muted">Quotation total</p>
            <p className="text-xl font-bold text-ink">{money(total, currency)}</p>
          </div>
          <Button size="lg" icon="arrowRight" disabled={closed || !ready} loading={submit.isPending} onClick={() => submit.mutate()}>
            {mine ? "Update quotation" : "Submit quotation"}
          </Button>
        </div>
      </Card>      <div className="mt-4">
        <ErrorNote error={submit.error} />
      </div>
    </>
  );
}
