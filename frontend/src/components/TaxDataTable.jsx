import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

const statusLabels = {
  single: "Single",
  married_joint: "Married filing jointly",
  head_of_household: "Head of household",
};

export default function TaxDataTable({ brackets }) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const columns = useMemo(
    () => [
      {
        accessorKey: "filing_status",
        header: "Filing status",
        cell: ({ getValue }) => statusLabels[getValue()] || getValue(),
      },
      {
        accessorKey: "min_income",
        header: "Starts at",
        cell: ({ getValue }) => `$${Number(getValue()).toLocaleString()}`,
      },
      {
        accessorKey: "max_income",
        header: "Ends at",
        cell: ({ getValue }) =>
          getValue() == null
            ? "No limit"
            : `$${Number(getValue()).toLocaleString()}`,
      },
      {
        accessorKey: "rate",
        header: "Rate",
        cell: ({ getValue }) => `${(Number(getValue()) * 100).toFixed(0)}%`,
      },
    ],
    [],
  );
  const table = useReactTable({
    data: brackets,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  return (
    <section className="tax-table-panel">
      <div className="tax-table-toolbar">
        <div>
          <p className="tax-kicker">Reference library</p>
          <h2>Federal brackets</h2>
        </div>
        <input
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="Filter brackets..."
          aria-label="Filter tax brackets"
        />
      </div>
      <div className="tax-table-wrap">
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    <button onClick={header.column.getToggleSortingHandler()}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      <span>
                        {header.column.getIsSorted() === "asc"
                          ? " ↑"
                          : header.column.getIsSorted() === "desc"
                            ? " ↓"
                            : ""}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
