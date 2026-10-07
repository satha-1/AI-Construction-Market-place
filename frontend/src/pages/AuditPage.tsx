import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

export default function AuditPage() {
  const { projectId = "" } = useParams();
  const [items, setItems] = useState("[]");

  useEffect(() => {
    api.audit(projectId)
      .then((rows) => setItems(JSON.stringify(rows, null, 2)))
      .catch((err) => setItems(err.message));
  }, [projectId]);

  return (
    <div>
      <p className="text-sm text-slate-500"><Link to={`/projects/${projectId}`}>Back to project</Link></p>
      <h1 className="mt-2 text-2xl font-semibold">Audit trail</h1>
      <pre className="mt-4 overflow-auto rounded-xl border bg-white p-4 text-sm">{items}</pre>
    </div>
  );
}
