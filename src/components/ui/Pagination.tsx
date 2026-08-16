import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // If only 1 page and no items, don't show pagination or show disabled
  if (totalItems === 0) return null;

  return (
    <div className={`flex items-center justify-between border-t border-black/5 bg-bg-primary px-4 py-3 sm:px-6 rounded-b-xl ${className}`}>
      <div className="flex flex-1 justify-between sm:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-text-secondary">
            Showing <span className="font-medium text-text-primary">{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</span> to <span className="font-medium text-text-primary">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
            <span className="font-medium text-text-primary">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-text-tertiary ring-1 ring-inset ring-black/5 hover:bg-bg-secondary focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="sr-only">First</span>
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 text-text-tertiary ring-1 ring-inset ring-black/5 hover:bg-bg-secondary focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            
            {/* Simple page numbers: show current, prev, next */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
              .map((page, index, array) => {
                const isCurrent = page === currentPage;
                // Add ellipsis logic if needed, but for simplicity we'll just show the filtered ones
                const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                
                return (
                  <React.Fragment key={page}>
                    {showEllipsisBefore && (
                      <span className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-text-secondary ring-1 ring-inset ring-black/5">
                        ...
                      </span>
                    )}
                    <button
                      onClick={() => onPageChange(page)}
                      aria-current={isCurrent ? 'page' : undefined}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-medium focus:z-20 focus:outline-offset-0 transition-colors ${
                        isCurrent
                          ? 'z-10 bg-accent-blue text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-blue'
                          : 'text-text-primary ring-1 ring-inset ring-black/5 hover:bg-bg-secondary'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 text-text-tertiary ring-1 ring-inset ring-black/5 hover:bg-bg-secondary focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-text-tertiary ring-1 ring-inset ring-black/5 hover:bg-bg-secondary focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="sr-only">Last</span>
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};
