import { createRequire } from "node:module";
import path from "node:path";
const requireTool = createRequire(path.join(process.cwd(), "package.json"));
export function mediaTool(kind: "ffmpeg" | "ffprobe"): string {
  const configured = process.env[kind === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH"];
  if (configured) return configured;
  try {
    const installed = requireTool(kind === "ffmpeg" ? "ffmpeg-static" : "ffprobe-static");
    return (kind === "ffmpeg" ? installed : installed.path) || kind;
  } catch { return kind; }
}
