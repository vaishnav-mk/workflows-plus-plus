export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8787/api";

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 10,
  MAX_PER_PAGE: 100,
  DATABASE_PER_PAGE: 1000,
  R2_OBJECTS_PER_PAGE: 25
} as const;

export const QUERY_CONFIG = {
  STALE_TIME: 5 * 60 * 1000,
  GC_TIME: 10 * 60 * 1000,
  CATALOG_STALE_TIME: 10 * 60 * 1000
} as const;

export const LAYOUT = {
  NODE_WIDTH: 260,
  NODE_HEIGHT: 100,
  CANVAS_WIDTH: 2000,
  NODE_SEPARATION: 50,
  RANK_SEPARATION: 150,
  MARGIN_X: 50,
  MARGIN_Y: 50
} as const;

export const TOAST = {
  DEFAULT_DURATION: 2500
} as const;

export const STORAGE_KEYS = {
  TOKEN: "cf_auth_token",
  WORKFLOW_PREFIX: "workflow-"
} as const;

export const ROUTES = {
  HOME: "/",
  BUILDER: "/builder",
  CREATE: "/create",
  WORKFLOWS: "/workflows",
  WORKERS: "/workers",
  DATABASES: "/databases",
  SETUP: "/setup",
  DEPLOYMENT: "/deployment"
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

export const DEPLOYMENT = {
  UNKNOWN_STEP: "unknown",
  EMPTY_MESSAGE: "",
  DEFAULT_PROGRESS: 0,
  STEP_WIDTH: 140,
  STEP_HEIGHT: 80,
  HORIZONTAL_GAP: 60,
  VERTICAL_GAP: 140,
  STEPS_PER_ROW: 5,
  CLOUDFLARE_ERROR_CODE_WORKER_EXISTS: 10040
} as const;

export const STRINGS = {
  UNKNOWN: "unknown",
  EMPTY: "",
  VIEW_INSTANCE: "View instance"
} as const;
