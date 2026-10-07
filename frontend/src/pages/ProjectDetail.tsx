import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, Document, Project } from "../api";

export default function ProjectDetail() {
  const { projectId = "" } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [chunks, setChunks] = useState<string>("");
  const [error, setError] = useState("");

  async function load() {
    const [p, d] = await Promise.all([api.project(projectId), api.documents(projectId)]);
    setProject(p);
    setDocs(d);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
    const timer = setInterval(() => {
      api.documents(projectId).then(setDocs).catch(() => undefined);
    }, 4000);
    return () => clearInterval(timer);
  }, [projectId]);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      await api.uploadDocument(projectId, file);
      input.value = "";
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function showChunks(docId: string) {
    try {
      const rows = await api.documentChunks(projectId, docId);
      setChunks(JSON.stringify(rows, null, 2));
    } catch (err) {
      setChunks(err instanceof Error ? err.message : "Failed");
    }
  }

  if (!project) return <p>{error || "Loading…"}</p>;

  return (
    <div>
      <p className="text-sm text-slate-500">
        <Link to="/projects">Projects</Link> / {project.name}
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{project.name}</h1>
      <p className="text-slate-600">{project.description || "No description"} · {project.status}</p>
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link className="rounded border px-3 py-2" to={`/projects/${projectId}/agent`}>Agent</Link>
        <Link className="rounded border px-3 py-2" to={`/projects/${projectId}/boq`}>BOQ / Estimate</Link>
        <Link className="rounded border px-3 py-2" to={`/projects/${projectId}/verification`}>Verification</Link>
        <Link className="rounded border px-3 py-2" to={`/projects/${projectId}/rfqs`}>RFQs</Link>
        <Link className="rounded border px-3 py-2" to={`/projects/${projectId}/audit`}>Audit trail</Link>
      </div>
      <h2 className="mt-8 font-semibold">Documents</h2>
      <form className="mt-3 flex flex-wrap items-center gap-3" onSubmit={onUpload}>
        <input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv" />
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Upload</button>
      </form>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <ul className="mt-4 space-y-2">
        {docs.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between rounded border bg-white px-4 py-3 text-sm">
            <span>
              {doc.file_name} · {doc.file_type} ·{" "}
              <span className={`uppercase ${doc.status === "processed" ? "text-emerald-700" : doc.status === "failed" ? "text-red-600" : "text-amber-700"}`}>
                {doc.status}
              </span>
            </span>
            <button className="text-amber-800" onClick={() => showChunks(doc.id)}>Chunks</button>
          </li>
        ))}
        {docs.length === 0 ? <li className="text-sm text-slate-500">No documents yet.</li> : null}
      </ul>
      {chunks ? <pre className="mt-4 max-h-80 overflow-auto rounded border bg-white p-3 text-xs">{chunks}</pre> : null}
    </div>
  );
}
