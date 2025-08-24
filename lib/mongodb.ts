import { MongoClient, Db } from 'mongodb';

const options = {};

let client: MongoClient | undefined;
let clientPromise: Promise<MongoClient> | undefined;

// Only check for MongoDB URI when actually trying to connect
function getMongoUri(): string {
  const uri = process.env.NODE_ENV === 'production' && process.env.MONGODB_URI_INTERNAL
    ? process.env.MONGODB_URI_INTERNAL
    : process.env.MONGODB_URI;
    
  if (!uri) {
    throw new Error('Please add your Mongo URI to .env.local');
  }
  
  return uri;
}

// Lazy initialization - only connect when actually needed
function getClientPromise(): Promise<MongoClient> {
  if (!clientPromise) {
    if (process.env.NODE_ENV === 'development') {
      // In development mode, use a global variable so that the value
      // is preserved across module reloads caused by HMR (Hot Module Replacement).
      let globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
      };

      if (!globalWithMongo._mongoClientPromise) {
        const uri = getMongoUri();
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect();
      }
      clientPromise = globalWithMongo._mongoClientPromise;
    } else {
      // In production mode, it's best to not use a global variable.
      const uri = getMongoUri();
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
  }
  
  return clientPromise;
}

// Export a function that returns the client promise
// This ensures connection is only attempted when actually needed
export default function getMongoClientPromise(): Promise<MongoClient> {
  return getClientPromise();
}

// Helper function to get database
export async function getDatabase(): Promise<Db> {
  const client = await getClientPromise();
  return client.db('tuvaloracion');
}
