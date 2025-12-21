import { ApiResponse } from "../../types/api";
import { PAGINATION } from "../constants";

export function createPaginationResponse<T>(
  data: T[],
  page: number = PAGINATION.DEFAULT_PAGE,
  perPage: number = PAGINATION.DEFAULT_PER_PAGE,
  total?: number
): ApiResponse<T[]> {
  const actualTotal = total !== undefined ? total : data.length;
  return {
    success: true,
    data,
    pagination: {
      page,
      per_page: perPage,
      total: actualTotal,
      total_pages: Math.ceil(actualTotal / perPage)
    }
  };
}
