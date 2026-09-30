import { Card, Chip } from "@heroui/react";
import { Activity } from "lucide-react";

function StatCard({ title, value, delta }) {
  return (
    <Card className="glass group overflow-hidden min-w-0">
      <Card.Header className="pb-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--card-muted))] text-[rgb(var(--foreground))] shadow-sm">
            <Activity size={16} />
          </div>
          <p className="min-w-0 truncate text-sm font-medium leading-5 text-[rgb(var(--muted))]">
            {title}
          </p>
        </div>
      </Card.Header>
      <Card.Content className="pb-5">
        <p className="wrap-break-word text-2xl font-semibold tracking-normal text-[rgb(var(--foreground))] sm:text-3xl md:text-4xl">
          {value}
        </p>
        {delta ? (
          <p className="mt-3 text-sm font-medium text-[rgb(var(--muted))]">
            {delta}
          </p>
        ) : null}
      </Card.Content>
      <div className="h-1 w-full bg-linear-to-r from-[rgb(var(--primary))] via-zinc-300 to-transparent opacity-70 transition group-hover:opacity-100" />
    </Card>
  );
}

export default StatCard;
