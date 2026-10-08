import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, type User } from "../../api";
import { useAuth } from "../../auth";
import { Badge, Button, DataTable, EmptyState, EntityCell, ErrorNote, LoadingBlock, PageHeader, SearchInput, Select, StatCard, StatusBadge, useToast, type Column } from "../../components/ui";
import { dateShort, errorMessage } from "../../lib/format";

export default function AdminUsers() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const { data = [], isLoading, error } = useQuery({ queryKey: ["admin", "users"], queryFn: api.adminUsers });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.adminUpdateRole(id, role),
    onSuccess: () => {
      toast.success("Role updated");
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.adminSetUserActive(id, active),
    onSuccess: (_d, v) => {
      toast.success(v.active ? "User activated" : "User deactivated");
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((u) => (!role || u.role === role) && (!term || u.email.toLowerCase().includes(term) || u.full_name.toLowerCase().includes(term)));
  }, [data, search, role]);

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "User",
      render: (u) => <EntityCell avatar={u.full_name} title={u.full_name} subtitle={u.email} />,
    },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <Select
          aria-label={`Role for ${u.email}`}
          value={u.role}
          disabled={u.id === me?.id}
          className="!min-h-[36px] max-w-[140px]"
          onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value })}
        >
          <option value="customer">Customer</option>
          <option value="vendor">Vendor</option>
          <option value="admin">Admin</option>
        </Select>
      ),
    },
    { key: "status", header: "Status", render: (u) => <StatusBadge status={u.is_active === false ? "inactive" : "active"} /> },
    { key: "created", header: "Joined", render: (u) => <span className="text-muted">{dateShort(u.created_at)}</span> },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (u) =>
        u.id === me?.id ? (
          <Badge tone="accent">You</Badge>
        ) : (
          <Button size="sm" icon={u.is_active === false ? "checkCircle" : "close"} variant={u.is_active === false ? "secondary" : "danger"} onClick={() => toggle.mutate({ id: u.id, active: u.is_active === false })}>
            {u.is_active === false ? "Activate" : "Deactivate"}
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader icon="users" tone="teal" title="Users" description="Change roles and enable or disable accounts. You cannot change your own role or deactivate yourself." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon="briefcase" tone="teal" label="Customers" value={data.filter((u) => u.role === "customer").length} />
        <StatCard icon="store" tone="blue" label="Vendors" value={data.filter((u) => u.role === "vendor").length} />
        <StatCard icon="shieldCheck" tone="violet" label="Admins" value={data.filter((u) => u.role === "admin").length} />
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_200px]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email" />
        <Select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="vendor">Vendors</option>
          <option value="admin">Admins</option>
        </Select>
      </div>
      <ErrorNote error={error} />
      {isLoading ? <LoadingBlock /> : <DataTable columns={columns} rows={rows} rowKey={(u) => u.id} empty={<EmptyState icon="users" title="No users match the filters" />} />}
    </>
  );
}
