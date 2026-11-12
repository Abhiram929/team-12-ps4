"use client";

import { useEffect, useState } from "react";

type Ticket = {
  id: number;
  title: string;
  priority: string;
  status: string;
  created_at: string;
  team_name: string | null;
};

const statusBadgeClasses: Record<string, string> = {
  open: "bg-sky-100 text-sky-800",
  in_progress: "bg-amber-100 text-amber-800",
  waiting_for_user: "bg-violet-100 text-violet-800",
  resolved: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-100 text-slate-700",
};

export default function TicketList({ refreshKey }: { refreshKey: number }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadTickets() {
      try {
        const response = await fetch("/api/tickets");
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load tickets.");
        if (active) {
          setTickets(result.tickets);
          setError("");
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load tickets.");
      }
    }

    void loadTickets();
    const intervalId = window.setInterval(() => void loadTickets(), 5000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [refreshKey]);

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold">My tickets</h2>
        <p className="text-xs text-slate-500">Refreshes automatically every 5 seconds.</p>
      </header>
      <ul className="divide-y divide-slate-100">
        {error && <li className="p-4 text-sm text-red-600">{error}</li>}
        {!error && tickets.length === 0 && (
          <li className="p-4 text-sm text-slate-500">No tickets yet.</li>
        )}
        {tickets.map((ticket) => (
          <li
            key={ticket.id}
            className="flex min-w-0 items-start justify-between gap-3 px-4 py-3 text-sm"
          >
            <div className="min-w-0">
              <p className="break-words font-medium text-slate-900">{ticket.title}</p>
              <p className="mt-1 text-xs text-slate-500">#{ticket.id} · {ticket.priority}</p>
              {ticket.team_name && (
                <p className="mt-1 break-words text-xs text-slate-500">{ticket.team_name}</p>
              )}
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                statusBadgeClasses[ticket.status] ?? "bg-slate-100 text-slate-700"
              }`}
            >
              {ticket.status.replaceAll("_", " ")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
