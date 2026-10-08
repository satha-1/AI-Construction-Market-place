import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, type AppNotification } from "../api";
import { Badge, Button, EmptyState, ErrorNote, LoadingBlock, PageHeader } from "../components/ui";
import { cx, timeAgo } from "../lib/format";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["notifications", "all"], queryFn: () => api.notifications() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  const readAll = useMutation({ mutationFn: api.markAllNotificationsRead, onSuccess: refresh });

  async function open(n: AppNotification) {
    if (!n.is_read) {
      await api.markNotificationRead(n.id).catch(() => undefined);
      refresh();
    }
    if (n.link) navigate(n.link);
  }

  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="RFQs, quotations and account updates."
        actions={
          <Button variant="secondary" disabled={!data?.unread} loading={readAll.isPending} onClick={() => readAll.mutate()}>
            Mark all as read
          </Button>
        }
      />
      <ErrorNote error={error} />
      {isLoading ? (
        <LoadingBlock />
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState pattern="circles" title="No notifications" description="You'll be notified here when something needs your attention." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {data!.items.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => open(n)} className={cx("flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-soft", !n.is_read && "bg-accent-soft/50")}>
                <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.is_read ? "bg-line" : "bg-accent")} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-ink">{n.title}</span>
                    <Badge>{n.kind}</Badge>
                  </span>
                  {n.body ? <span className="mt-1 block text-xs text-muted">{n.body}</span> : null}
                </span>
                <span className="shrink-0 text-[11px] text-subtle">{timeAgo(n.created_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
