"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyRevenuePoint } from "@/lib/metrics";
import { formatINR } from "@/lib/format";

const REVENUE_BLUE = "#3b82f6"; // status-blue — single series, single hue

function compactINR(value: number): string {
  if (value >= 1000) return `₹${Math.round(value / 1000)}k`;
  return `₹${value}`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/10">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">
        Revenue:{" "}
        <span className="font-medium text-foreground">{formatINR(payload[0].value)}</span>
      </p>
    </div>
  );
}

export function RevenueChart({ data }: { data: MonthlyRevenuePoint[] }) {
  const hasData = data.some((d) => d.revenue > 0);

  if (!hasData) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No completed-trip revenue in the last 7 months yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#262626" strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          tickFormatter={compactINR}
          width={48}
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="revenue" fill={REVENUE_BLUE} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
