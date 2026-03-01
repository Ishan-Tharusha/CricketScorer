"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  /** Column alignment per column; length = number of columns */
  columns: ("left" | "right")[];
  /** Optional: index of column to hide on small screens (e.g. 6 for "hidden sm:table-cell") */
  hiddenSmColumnIndex?: number;
  /** Number of skeleton rows */
  rows?: number;
  /** Optional class for the card wrapper */
  className?: string;
}

export function TableSkeleton({
  columns,
  rows = 4,
  className,
  hiddenSmColumnIndex,
}: TableSkeletonProps) {
  const thClass = (i: number) => {
    const base = `py-3 sm:py-4 px-3 sm:px-4 font-semibold text-foreground ${columns[i] === "right" ? "text-right" : "text-left"}`;
    return hiddenSmColumnIndex === i ? `${base} hidden sm:table-cell` : base;
  };
  const tdClass = (i: number) => {
    const base = `py-3 sm:py-4 px-3 sm:px-4 ${columns[i] === "right" ? "text-right" : "text-left"}`;
    return hiddenSmColumnIndex === i ? `${base} hidden sm:table-cell` : base;
  };
  return (
    <Card className={`bg-white border border-gray-200 shadow-md overflow-hidden rounded-2xl ${className ?? ""}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-100">
              {columns.map((align, i) => (
                <th key={i} className={thClass(i)}>
                  <Skeleton className="h-4 w-16 bg-gray-300" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-100">
                {columns.map((_, colIndex) => (
                  <td key={colIndex} className={tdClass(colIndex)}>
                    <Skeleton
                      className={`h-4 bg-gray-200 ${colIndex === 0 ? "w-32 min-w-[8rem]" : "w-10"} ${columns[colIndex] === "right" ? "ml-auto" : ""}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
