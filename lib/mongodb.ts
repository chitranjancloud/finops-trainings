import mongoose from "mongoose";
import { setServers } from "node:dns";

const MONGO_URI =
  process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.warn("⚠️ MongoDB URI not found");
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = {
    conn: null,
    promise: null,
  };
}

export async function connectDB() {
  // already connected
  if (cached.conn) {
    console.log("✅ Using existing MongoDB connection");
    return cached.conn;
  }

  // no URI
  if (!MONGO_URI) {
    throw new Error(
      "❌ MongoDB URI missing in .env (MONGO_URI or MONGODB_URI)"
    );
  }

  // create connection
  if (!cached.promise) {
    // Opt-in for networks whose default DNS resolver rejects Atlas SRV lookups.
    // Leave unset to preserve the deployment's DNS configuration.
    const dnsServers = process.env.MONGODB_DNS_SERVERS
      ?.split(",")
      .map((server) => server.trim())
      .filter(Boolean);
    if (dnsServers?.length) setServers(dnsServers);

    console.log("⏳ Connecting to MongoDB...");

    cached.promise = mongoose
      .connect(MONGO_URI, {
        dbName: "finops",
        serverSelectionTimeoutMS: 5000,
      })
      .then((mongoose) => {
        console.log("✅ MongoDB Connected");
        return mongoose;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // A rejected promise must not poison every later login attempt.
    cached.promise = null;
    throw error;
  }
  return cached.conn;
}
