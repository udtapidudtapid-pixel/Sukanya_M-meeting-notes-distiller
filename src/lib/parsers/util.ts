export function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[_\-]+/g, " ").trim() || "Untitled meeting";
}
