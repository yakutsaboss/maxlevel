import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function AdminPagination({ page, totalPages, onPageChange }: AdminPaginationProps) {
  return (
    <div className="flex items-center justify-center gap-4 pt-2">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="w-9 h-9 rounded-lg bg-telegram-secondaryBg flex items-center justify-center disabled:opacity-30 text-telegram-text"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm text-telegram-hint">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="w-9 h-9 rounded-lg bg-telegram-secondaryBg flex items-center justify-center disabled:opacity-30 text-telegram-text"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
