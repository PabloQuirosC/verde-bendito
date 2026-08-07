import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/store/useStore";
import { formatDateTime } from "@/lib/format";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/Pagination";

export const Route = createFileRoute("/_app/auditoria")({
  component: AuditPage,
});

function AuditPage() {
  const logs = useStore((s) => s.logs);
  const pag = usePagination(logs, 4);

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="font-display text-2xl sm:text-3xl mb-1">Auditoría</h1>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4 md:mb-6">
        Registro de las últimas {logs.length} acciones del sistema.
      </p>

      <div className="pos-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-muted/50 text-[10px] sm:text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2 sm:p-3 text-left">Fecha</th>
                <th className="p-2 sm:p-3 text-left">Usuario</th>
                <th className="p-2 sm:p-3 text-left">Accion</th>
                <th className="p-2 sm:p-3 text-left hidden sm:table-cell">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.length === 0 && (
                <tr><td colSpan={4} className="p-6 sm:p-8 text-center text-muted-foreground text-xs sm:text-sm">
                  Sin actividad todavía.
                </td></tr>
              )}
              {pag.pageItems.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30">
                  <td className="p-2 sm:p-3 text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(l.at)}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm">{l.user}</td>
                  <td className="p-2 sm:p-3 font-medium text-xs sm:text-sm">{l.action}</td>
                  <td className="p-2 sm:p-3 text-muted-foreground hidden sm:table-cell text-xs">{l.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={pag.page}
          totalPages={pag.totalPages}
          rangeStart={pag.rangeStart}
          rangeEnd={pag.rangeEnd}
          total={pag.total}
          onPage={pag.setPage}
        />
      </div>
    </div>
  );
}
