import * as dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function main() {
  const uri = process.env['MONGO_URI'] as string; 

  if (!uri) {
    throw new Error('MONGO_URI not found in .env file');
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('fridaylife'); 
    const collections = await db.listCollections().toArray();
  } catch (err) {
    console.error('❌ Error connecting to MongoDB:', err);
  } finally {
    await client.close();
  }
}

main();

