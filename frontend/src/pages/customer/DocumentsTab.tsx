import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api, type Document } from "../../api";
import { Button, Card, CardHeader, DataTable, EmptyState, ErrorNote, LoadingBlock, Modal, StatusBadge, useToast, type Column } from "../../components/ui";
import { dateTime, errorMessage } from "../../lib/format";
import { useProjectId } from "./ProjectWorkspace";

export default function DocumentsTab() {
  const projectId = useProjectId();
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [chunksFor, setChunksFor] = useState<Document | null>(null);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["documents", projectId],
    queryFn: () => api.documents(projectId),
    // Keep polling while any document is still being processed.
    refetchInterval: (q) => ((q.state.data ?? []).some((d) => d.status !== "processed" && d.status !== "failed") ? 3000 : false),
  });
  const chunks = useQuery({
    queryKey: ["chunks", projectId, chunksFor?.id],
    queryFn: () => api.documentChunks(projectId, chunksFor!.id),
    enabled: !!chunksFor,
  });

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadDocument(projectId, file),
    onSuccess: () => {
      toast.success("Document uploaded — processing started");
      qc.invalidateQueries({ queryKey: ["documents", projectId] });
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const columns: Column<Document>[] = [
    { key: "name", header: "File", render: (d) => <span className="font-bold">{d.file_name}</span> },
    { key: "type", header: "Type", render: (d) => <span className="uppercase text-muted">{d.file_type}</span> },
    { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} /> },
    { key: "date", header: "Uploaded", render: (d) => <span className="text-muted">{dateTime(d.uploaded_at)}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (d) => (
        <Button size="sm" variant="secondary" disabled={d.status !== "processed"} onClick={() => setChunksFor(d)}>
          View chunks
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card className="mb-6">
        <CardHeader title="Upload project documents" description="PDF drawings, scanned images, Excel or CSV BOQs. Files are parsed and indexed automatically." />
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
            className="min-h-[44px] max-w-full flex-1 rounded-ui border border-dashed border-line bg-soft px-3 py-2.5 text-xs text-muted file:mr-3 file:rounded-ui file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-[11px] file:font-bold file:uppercase file:text-accent-fg"
            aria-label="Select document"
          />
          <Button
            loading={upload.isPending}
            onClick={() => {
              const file = fileRef.current?.files?.[0];
              if (file) upload.mutate(file);
              else toast.info("Choose a file first");
            }}
          >
            Upload
          </Button>
        </div>
      </Card>

      <ErrorNote error={error} />
      {isLoading ? <LoadingBlock /> : <DataTable columns={columns} rows={data} rowKey={(d) => d.id} empty={<EmptyState pattern="grid" title="No documents yet" description="Upload drawings or an existing BOQ to let the assistant extract requirements." />} />}

      <Modal open={!!chunksFor} onClose={() => setChunksFor(null)} title={chunksFor ? `Chunks · ${chunksFor.file_name}` : "Chunks"} wide>
        {chunks.isLoading ? (
          <LoadingBlock />
        ) : (
          <ol className="space-y-3">
            {(chunks.data ?? []).map((c) => (
              <li key={c.id} className="rounded-ui border border-line bg-soft p-3">
                <p className="label-caps mb-1">Chunk {c.chunk_index + 1}</p>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink">{c.content}</p>
              </li>
            ))}
            {(chunks.data ?? []).length === 0 ? <p className="text-xs text-muted">No chunks were extracted.</p> : null}
          </ol>
        )}
      </Modal>
    </>
  );
}
