import type { BreadcrumbItem } from "@/components/ui";

const VALID_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/builder$/,
  /^\/create$/,
  /^\/workflows$/,
  /^\/workflows\/[^/]+\/instances$/,
  /^\/workflows\/[^/]+\/instances\/[^/]+$/,
  /^\/workers$/,
  /^\/workers\/[^/]+$/,
  /^\/workers\/[^/]+\/versions$/,
  /^\/workers\/[^/]+\/versions\/[^/]+$/,
  /^\/setup$/,
  /^\/deployment$/,
  /^\/databases$/,
  /^\/databases\/[^/]+$/,
];

export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (!pathname || pathname === "/") {
    return [{ label: "Home", href: "/" }];
  }

  // Check if this is a 404 page (invalid route)
  const is404 = !VALID_ROUTE_PATTERNS.some(pattern => pattern.test(pathname));

  if (is404) {
    return [
      { label: "Home", href: "/" },
      { label: "404", href: undefined },
    ];
  }

  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [];

  // Add home
  items.push({ label: "Home", href: "/" });

  // Build breadcrumbs from segments
  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Format label (capitalize, replace dashes with spaces)
    let label = segment
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Special handling for databases
    if (segment === "databases") {
      label = "Databases";
    } else if (segments[0] === "databases" && index === 1) {
      // This is a database ID, show a more user-friendly label
      label = "Database Details";
    }

    // Last segment is not a link
    const isLast = index === segments.length - 1;
    items.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  });

  return items;
}

