import { MongoClient, Db } from 'mongodb';

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

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

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    try {
      const uri = getMongoUri();
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    } catch (error) {
      // During build time, we might not have the URI yet
      globalWithMongo._mongoClientPromise = Promise.reject(error);
    }
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  try {
    const uri = getMongoUri();
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  } catch (error) {
    // During build time, we might not have the URI yet
    clientPromise = Promise.reject(error);
  }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

// Helper function to get database
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db('tuvaloracion');
}
