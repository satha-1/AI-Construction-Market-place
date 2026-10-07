import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Project } from "../api";

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setProjects(await api.projects());
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await api.createProject({ name, location });
      setName("");
      setLocation("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Projects</h1>
      <form className="mt-6 flex gap-3" onSubmit={onSubmit}>
        <input className="rounded border px-3 py-2" placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="rounded border px-3 py-2" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Create</button>
      </form>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <Link key={project.id} to={`/projects/${project.id}`} className="rounded-xl border bg-white p-5 hover:border-amber-700">
            <p className="font-semibold">{project.name}</p>
            <p className="text-sm text-slate-500">{project.location ?? "No location"} · {project.status}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
