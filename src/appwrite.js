import { Client, Databases, ID, Query } from "appwrite";

const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TABLE_ID = import.meta.env.VITE_APPWRITE_TABLE; // 👈 metrics tabela
const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT; // https://fra.cloud.appwrite.io/v1



const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);

const database = new Databases(client);

export const updateSearchCount = async (searchTerm, movie) => {
  try {
    // 1) nađi dokument sa istim searchTerm-om
    const result = await database.listDocuments(DATABASE_ID, TABLE_ID, [
      Query.equal("searchTerm", searchTerm),
    ]);

    if (result.total > 0) {
      // 2) ako postoji → povećaj count
      const doc = result.documents[0];
      const currentCount = Number(doc.count ?? 0);
      const newCount = currentCount + 1;

      await database.updateDocument(DATABASE_ID, TABLE_ID, doc.$id, {
        count: newCount,
      });
    } else {
      // 3) ako ne postoji → napravi novi
      await database.createDocument(DATABASE_ID, TABLE_ID, ID.unique(), {
        searchTerm,
        count: 1,
        movie_id: movie.id,
        poster_url: `https://image.tmdb.org/t/p/w500/${movie.poster_path}`,
      });
    }
  } catch (error) {
    console.error("updateSearchCount error:", error);
  }
};
