/**
 * Converts Google Drive shareable URLs into direct image source URLs.
 * This allows <img> tags to correctly render images from standard Google Drive file links.
 */
export function getDirectDriveUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();

  try {
    // Parse URL if valid to extract standard drive parameters easily
    if (trimmed.includes("drive.google.com")) {
      const parsed = new URL(trimmed);
      
      // Path format: /file/d/ID/view
      if (parsed.pathname.startsWith("/file/d/")) {
        const parts = parsed.pathname.split("/");
        // Parts will be: ["", "file", "d", "ID", "view"]
        const id = parts[3];
        if (id) {
          return `https://lh3.googleusercontent.com/d/${id}`;
        }
      }
      
      // Search parameters format: ?id=ID
      const id = parsed.searchParams.get("id");
      if (id) {
        return `https://lh3.googleusercontent.com/d/${id}`;
      }
    }
  } catch (err) {
    // Fall back to regex if URL parsing fails
  }

  // Regex fallback 1 (File View URL)
  const driveFileRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match1 = trimmed.match(driveFileRegex);
  if (match1 && match1[1]) {
    return `https://lh3.googleusercontent.com/d/${match1[1]}`;
  }

  // Regex fallback 2 (Open/UC ID)
  const driveOpenRegex = /[?&]id=([a-zA-Z0-9_-]+)/;
  const match2 = trimmed.match(driveOpenRegex);
  if (match2 && match2[1] && trimmed.includes("drive.google.com")) {
    return `https://lh3.googleusercontent.com/d/${match2[1]}`;
  }

  return trimmed;
}
