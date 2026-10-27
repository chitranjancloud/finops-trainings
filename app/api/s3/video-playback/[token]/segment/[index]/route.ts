import { storageRoute } from "@/lib/storage/s3Api";
import { videoSegment } from "@/lib/video/api";
export const runtime = "nodejs";
export const GET = storageRoute("playback", videoSegment);
