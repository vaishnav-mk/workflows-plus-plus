"use client";

import React, { useState } from "react";
import {
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
  Button,
  Dropdown,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { PaginationProps } from "@/types/components";

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  hasNext,
  hasPrevious,
  onNext,
  onPrevious,
  onFirst,
  currentItems,
  totalItemsCount,
  clientItemsPerPage,
  onItemsPerPageChange,
  showItemsPerPage = false,
}: PaginationProps) {
  const isCursorBased = hasNext !== undefined || hasPrevious !== undefined;
  
  const [pageInput, setPageInput] = useState(
    currentPage ? currentPage.toString() : "1"
  );

  React.useEffect(() => {
    if (currentPage) {
    setPageInput(currentPage.toString());
    }
  }, [currentPage]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputBlur = () => {
    if (!currentPage || !totalPages || !onPageChange) return;
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handlePageInputBlur();
    }
  };

  const isFirstDisabled = isCursorBased 
    ? !hasPrevious 
    : currentPage === 1;
  const isLastDisabled = isCursorBased 
    ? !hasNext 
    : currentPage === totalPages;

  const handleFirst = () => {
    if (isCursorBased && onFirst) {
      onFirst();
    } else if (currentPage && onPageChange) {
      onPageChange(1);
    }
  };

  const handlePrevious = () => {
    if (isCursorBased && onPrevious) {
      onPrevious();
    } else if (currentPage && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (isCursorBased && onNext) {
      onNext();
    } else if (currentPage && totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  const handleLast = () => {
    if (!isCursorBased && currentPage && totalPages && onPageChange) {
      onPageChange(totalPages);
    }
  };

  const itemsPerPageOptions = [
    { value: "10", label: "10" },
    { value: "25", label: "25" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ];

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-neutral-600 grow flex items-center gap-4">
        {currentItems !== undefined && totalItemsCount !== undefined && (
          <span>
            Showing {currentItems} {currentItems === 1 ? 'vector' : 'vectors'} 
            {totalItemsCount > 0 && ` of ${totalItemsCount} total`}
          </span>
        )}
        {showItemsPerPage && clientItemsPerPage !== undefined && onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Items per page:</span>
            <Dropdown
              options={itemsPerPageOptions}
              value={clientItemsPerPage.toString()}
              onChange={(value: string) => onItemsPerPageChange(parseInt(value, 10))}
              className="w-20"
            />
          </div>
        )}
      </div>
      <div>
        <div className="bg-gray-50 text-gray-900 outline-none h-9 rounded-lg text-base border-gray-300 border-0 flex gap-0 overflow-hidden px-0 ring ring-gray-950/10 shadow-xs focus-within:ring-primary">
          <Button
            variant="secondary"
            onClick={handleFirst}
            disabled={isFirstDisabled}
            className={cn(
              "rounded-none h-full",
              isFirstDisabled && "opacity-50 cursor-not-allowed"
            )}
            aria-label="First page"
          >
            <ChevronsLeftIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            onClick={handlePrevious}
            disabled={isFirstDisabled}
            className={cn(
              "rounded-none h-full",
              isFirstDisabled && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          {!isCursorBased && currentPage && (
          <input
            type="text"
            value={pageInput}
            onChange={handlePageInputChange}
            onBlur={handlePageInputBlur}
            onKeyDown={handlePageInputKeyDown}
            className={cn(
              "text-gray-900 outline-none text-base border-0 h-full rounded-none flex items-center bg-white font-sans focus:border-gray-300 px-0 border-l border-gray-300 text-center"
            )}
            style={{ width: "50px" }}
            aria-label="Page number"
          />
          )}
          <Button
            variant="secondary"
            onClick={handleNext}
            disabled={isLastDisabled}
            className={cn(
              "rounded-none h-full",
              isLastDisabled && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Next page"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
          {!isCursorBased && (
          <Button
            variant="secondary"
              onClick={handleLast}
            disabled={isLastDisabled}
            className={cn(
              "rounded-none h-full",
              isLastDisabled && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Last page"
          >
            <ChevronsRightIcon className="w-4 h-4" />
          </Button>
          )}
        </div>
      </div>
    </div>
  );
}
