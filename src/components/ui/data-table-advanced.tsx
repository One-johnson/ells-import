"use client";

import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState, useEffect } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Columns } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface DataTableAdvancedProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  sortable?: boolean;
  initialSorting?: SortingState;
  /** Placeholder for global filter input */
  filterPlaceholder?: string;
  /** Page size options */
  pageSizeOptions?: number[];
  className?: string;
  /** Enable row selection; getRowId required when true */
  enableRowSelection?: boolean;
  getRowId?: (originalRow: TData) => string;
  /** Controlled row selection state (optional). When provided, selection is controlled. */
  rowSelection?: RowSelectionState;
  /** Controlled selection change (use with rowSelection to clear from parent) */
  onRowSelectionChange?: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  /** Called when selection changes with selected row data */
  onSelectionChange?: (selectedRows: TData[]) => void;
  /** Rendered above table when rows are selected */
  bulkActions?: React.ReactNode;
}

export function DataTableAdvanced<TData, TValue>({
  columns,
  data,
  sortable = true,
  initialSorting = [],
  filterPlaceholder = "Filter...",
  pageSizeOptions = [10, 20, 50, 100],
  className,
  enableRowSelection = false,
  getRowId,
  rowSelection: controlledRowSelection,
  onRowSelectionChange: controlledOnRowSelectionChange,
  onSelectionChange,
  bulkActions,
}: DataTableAdvancedProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});
  const rowSelection = controlledRowSelection ?? internalRowSelection;
  const setRowSelection = controlledOnRowSelectionChange ?? setInternalRowSelection;

  const selectionColumn: ColumnDef<TData, TValue> = {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() ? "indeterminate" : false)}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
  };

  const columnsWithSelection = enableRowSelection ? [selectionColumn, ...columns] : columns;

  const table = useReactTable({
    data,
    columns: columnsWithSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      ...(enableRowSelection ? { rowSelection } : {}),
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    ...(enableRowSelection ? { onRowSelectionChange: setRowSelection, getRowId } : {}),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedRows = enableRowSelection ? table.getSelectedRowModel().rows.map((r) => r.original) : [];
  useEffect(() => {
    if (enableRowSelection && onSelectionChange) onSelectionChange(selectedRows);
  }, [enableRowSelection, rowSelection, onSelectionChange]);

  const visibleColumns = table.getAllColumns().filter((col) => typeof col.accessorFn !== "undefined" && col.getCanHide());

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          placeholder={filterPlaceholder}
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {visibleColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {enableRowSelection && selectedRows.length > 0 && bulkActions && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <span className="text-sm text-muted-foreground">{selectedRows.length} selected</span>
          {bulkActions}
        </div>
      )}

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort =
                    sortable &&
                    header.column.getCanSort() &&
                    header.column.columnDef.enableSorting !== false;
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
                <TableCell colSpan={columnsWithSelection.length} className="h-24 text-center text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} row(s)
          {table.getFilteredRowModel().rows.length !== table.getCoreRowModel().rows.length &&
            ` (filtered from ${table.getCoreRowModel().rows.length})`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
