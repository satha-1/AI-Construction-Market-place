import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type AppNotification } from "../api";
import { Icon } from "../components/Icon";
import { Badge, Button, EmptyState, ErrorNote, IconTile, LoadingBlock, PageHeader, Tabs } from "../components/ui";
import { cx, timeAgo, titleCase } from "../lib/format";
import { notificationVisual } from "../lib/visuals";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
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

  const items = (data?.items ?? []).filter((n) => filter === "all" || !n.is_read);

  return (
    <>
      <PageHeader
        icon="bell"
        tone="amber"
        title="Notifications"
        description="RFQs, quotations and account updates."
        actions={
          <Button variant="secondary" icon="checkCircle" disabled={!data?.unread} loading={readAll.isPending} onClick={() => readAll.mutate()}>
            Mark all as read
          </Button>
        }
      />
      <div className="mb-4 inline-flex">
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            { id: "all", label: "All", icon: "inbox" },
            { id: "unread", label: "Unread", icon: "bell", badge: data?.unread },
          ]}
        />
      </div>
      <ErrorNote error={error} />
      {isLoading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState icon="bell" tone="amber" title={filter === "unread" ? "You're all caught up" : "No notifications"} description="You'll be notified here when something needs your attention." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card">
          {items.map((n) => {
            const v = notificationVisual(n.kind);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => open(n)}
                  className={cx("group flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-soft", !n.is_read && "bg-accent-soft/40")}
                >
                  <IconTile icon={v.icon} tone={v.tone} round />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{n.title}</span>
                      <Badge>{titleCase(n.kind)}</Badge>
                      {!n.is_read ? <span className="h-2 w-2 rounded-full bg-accent" aria-label="Unread" /> : null}
                    </span>
                    {n.body ? <span className="mt-1 block text-sm text-muted">{n.body}</span> : null}
                    <span className="mt-1.5 flex items-center gap-1 text-xs text-subtle">
                      <Icon name="clock" className="h-3.5 w-3.5" />
                      {timeAgo(n.created_at)}
                    </span>
                  </span>
                  {n.link ? <Icon name="chevron" className="mt-2 h-4 w-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
