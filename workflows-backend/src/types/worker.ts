export interface Worker {
  id: string;
  name: string;
  created_on: string;
  modified_on: string;
}

export interface WorkersV4PagePaginationArray {
  data: Worker[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
