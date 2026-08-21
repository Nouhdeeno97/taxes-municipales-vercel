import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
};

export function PaginationControls({ page, pageSize, total, onPageChange, label = "résultat" }: PaginationControlsProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : page * pageSize + 1;
  const last = Math.min(total, (page + 1) * pageSize);

  return <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
    <p>{total === 0 ? `Aucun ${label}` : `${first}–${last} sur ${total} ${label}${total > 1 ? "s" : ""}`}</p>
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" disabled={page === 0} onClick={() => onPageChange(page - 1)}>Précédent</Button>
      <span className="min-w-24 text-center text-xs font-medium text-slate-500">Page {page + 1} / {pageCount}</span>
      <Button type="button" size="sm" variant="outline" disabled={page + 1 >= pageCount} onClick={() => onPageChange(page + 1)}>Suivant</Button>
    </div>
  </div>;
}
