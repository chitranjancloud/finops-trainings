import { initUpload, storageRoute } from "@/lib/storage/s3Api";
export const runtime = "nodejs";
export const POST = storageRoute("upload", initUpload);
