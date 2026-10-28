import mongoose from "mongoose";

const MONGO_URI =
  process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.warn("⚠️ MongoDB URI not found");
}

type ConnectionCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const connectionGlobal = globalThis as typeof globalThis & { mongoose?: ConnectionCache };
const cached: ConnectionCache = connectionGlobal.mongoose ??= { conn: null, promise: null };

export async function connectDB() {
  // already connected
  if (cached.conn?.connection.readyState === 1) {
    return cached.conn;
  }

  if (cached.conn?.connection.readyState === 0) {
    cached.conn = null;
    cached.promise = null;
  }

  // no URI
  if (!MONGO_URI) {
    throw new Error(
      "❌ MongoDB URI missing in .env (MONGO_URI or MONGODB_URI)"
    );
  }

  // create connection
  if (!cached.promise) {
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
    return cached.conn;
  } catch (error) {
    // A temporary outage must not leave every later request awaiting a rejected promise.
    cached.conn = null;
    cached.promise = null;
    throw error;
  }
}
