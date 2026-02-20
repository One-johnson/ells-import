"use client";

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Enable sortable column headers (default true) */
  sortable?: boolean;
  /** Initial sort state e.g. [{ id: "createdAt", desc: true }] */
  initialSorting?: SortingState;
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  sortable = true,
  initialSorting = [],
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className={cn("rounded-lg border border-border", className)}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort =
                  sortable &&
                  header.column.getCanSort() &&
                  typeof header.column.columnDef.enableSorting !== "false";
                return (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {canSort ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-4 h-8 font-medium hover:bg-muted"
                        onClick={() => header.column.toggleSorting(header.column.getIsSorted() === "asc")}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="ml-2">
                          {header.column.getIsSorted() === "desc" ? (
                            <ArrowDown className="size-4" />
                          ) : header.column.getIsSorted() === "asc" ? (
                            <ArrowUp className="size-4" />
                          ) : (
                            <ArrowUpDown className="size-4 text-muted-foreground" />
                          )}
                        </span>
                      </Button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
