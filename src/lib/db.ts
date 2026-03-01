import mongoose from "mongoose";
import dns from "node:dns";

// Set DNS servers explicitly to resolve Atlas SRV records (Windows DNS fix)
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
console.log("[MongoDB] DNS Servers set to:", dns.getServers());

// Set DNS resolution to use system resolver (fixes Bun DNS SRV issue on Windows)
dns.setDefaultResultOrder('ipv4first');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached = globalThis.mongoose ?? { conn: null, promise: null };
if (process.env.NODE_ENV !== "production") globalThis.mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) throw new Error("MONGODB_URI is not set. Add it to .env.local");
  
  try {
    console.log("Attempting to connect to MongoDB...");
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
      cached.promise = mongoose.connect(MONGODB_URI, {
        // Increase timeout for DNS resolution
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        // Use IPv4 for DNS resolution (Windows fix)
        family: 4,
      });
    }
    cached.conn = await cached.promise;
    console.log("Connected to MongoDB successfully");
    return cached.conn;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}
