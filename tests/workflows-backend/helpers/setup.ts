/**
 * Global test setup
 */

import { beforeAll, afterEach } from "vitest";
import { fetchMock } from "cloudflare:test";

beforeAll(() => {
  // Enable outbound request mocking
  fetchMock.activate();
  // Throw errors if an outbound request isn't mocked
  fetchMock.disableNetConnect();
});

afterEach(() => {
  // Ensure we matched every mock we defined
  fetchMock.assertNoPendingInterceptors();
});

