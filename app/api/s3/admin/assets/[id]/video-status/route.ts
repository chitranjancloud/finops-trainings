import { storageRoute } from "@/lib/storage/s3Api";
import { videoStatus } from "@/lib/video/api";
export const runtime = "nodejs";
export const GET = storageRoute("upload", videoStatus);
