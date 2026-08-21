import { useState, useMemo } from "react";
import type { ColumnDef, DataTableProps } from "../types";

type SortDir = "asc" | "desc";

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pageSize = 10,
  searchable = true,
  searchKeys,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    const keys = searchKeys ?? (columns.map((c) => c.key) as (keyof T & string)[]);
    return data.filter((row) =>
      keys.some((k) => {
        const v = row[k];
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [data, search, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey as keyof T];
      const bv = b[sortKey as keyof T];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paged = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  function sortIndicator(col: ColumnDef<T>) {
    if (sortKey !== col.key) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  return (
    <div className="data-table-wrapper">
      {searchable && (
        <input
          className="data-table-search"
          type="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          aria-label="Search table"
        />
      )}
      {sorted.length === 0 ? (
        <p className="data-table-empty">{emptyMessage}</p>
      ) : (
        <>
          <table className="data-table" role="table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    style={{ cursor: col.sortable !== false ? "pointer" : "default" }}
                    scope="col"
                  >
                    {col.label}
                    {col.sortable !== false && sortIndicator(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key] != null
                          ? String(row[col.key])
                          : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="data-table-pagination" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <button disabled={safePage === 0} onClick={() => setPage(0)}>
              &laquo;
            </button>
            <button disabled={safePage === 0} onClick={() => setPage((p) => p - 1)}>
              &lsaquo;
            </button>
            <span>
              Page {safePage + 1} of {totalPages}
            </span>
            <button disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              &rsaquo;
            </button>
            <button disabled={safePage >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>
              &raquo;
            </button>
          </div>
        </>
      )}
    </div>
  );
}
