import { storageRoute } from "@/lib/storage/s3Api";
import { retryVideo } from "@/lib/video/api";
export const runtime = "nodejs";
export const POST = storageRoute("upload", retryVideo);
