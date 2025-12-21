export interface ParsedUrlParams {
  databaseId: string | null;
  databaseName: string | null;
  query: string | null;
  returnNodeId: string | null;
  returnToBuilder: string | null;
  type: string | null;
  id: string | null;
  templateType: string | null;
}

export function parseUrlParams(searchString: string): ParsedUrlParams {
  const searchToParse = searchString.startsWith("?")
    ? searchString.substring(1)
    : searchString;
  const params = new URLSearchParams(searchToParse);

  let manualDatabaseId: string | null = null;
  let manualQuery: string | null = null;
  let manualReturnNodeId: string | null = null;

  if (searchString) {
    const matchDatabaseId = searchString.match(/[?&]database_id=([^&]+)/);
    const matchQuery = searchString.match(/[?&]query=([^&]+)/);
    const matchReturnNodeId = searchString.match(/[?&]returnNodeId=([^&]+)/);

    manualDatabaseId = matchDatabaseId
      ? decodeURIComponent(matchDatabaseId[1])
      : null;
    manualQuery = matchQuery ? decodeURIComponent(matchQuery[1]) : null;
    manualReturnNodeId = matchReturnNodeId
      ? decodeURIComponent(matchReturnNodeId[1])
      : null;
  }

  const databaseId = params.get("database_id") || manualDatabaseId;
  const databaseName = params.get("database") || null;
  const query = params.get("query") || manualQuery;
  const returnNodeId = params.get("returnNodeId") || manualReturnNodeId;
  const returnToBuilder = params.get("returnToBuilder") || null;
  const type = params.get("type") || null;
  const id = params.get("id") || null;
  const templateType = params.get("template_type") || null;

  return {
    databaseId,
    databaseName,
    query,
    returnNodeId,
    returnToBuilder,
    type,
    id,
    templateType
  };
}

export function cleanUrlParams(
  params: URLSearchParams,
  preserveKeys: string[] = []
): URLSearchParams {
  const newParams = new URLSearchParams();
  const keysToRemove = [
    "database_id",
    "database",
    "query",
    "returnNodeId",
    "returnToBuilder"
  ];

  for (const [key, value] of params.entries()) {
    if (!keysToRemove.includes(key) || preserveKeys.includes(key)) {
      newParams.set(key, value);
    }
  }

  return newParams;
}

