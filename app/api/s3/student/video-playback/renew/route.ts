import { storageRoute } from "@/lib/storage/s3Api";
import { renewVideoPlayback } from "@/lib/video/api";
export const runtime = "nodejs";
export const POST = storageRoute("playback", renewVideoPlayback);
