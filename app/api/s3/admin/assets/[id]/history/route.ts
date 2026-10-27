import { assetHistory, storageRoute } from "@/lib/storage/s3Api";
export const runtime = "nodejs";
export const GET = storageRoute("upload", assetHistory);
