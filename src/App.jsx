import React, { useEffect, useState } from "react";
import "./index.css";
import Search from "./components/Search";
import MovieCard from "./components/movieCard";
import "flowbite";
import { useDebounce } from "react-use";
import { Client, Databases, ID, Query } from "appwrite";

const API_BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const API_OPTIONS = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
};

// Appwrite config
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const APPWRITE_TABLE = import.meta.env.VITE_APPWRITE_TABLE;
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;


console.log("ENV CHECK:", {
  PROJECT_ID,
  DATABASE_ID,
  APPWRITE_TABLE,
  APPWRITE_ENDPOINT,
});

const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(PROJECT_ID);
const database = new Databases(client);

const updateSearchCount = async (searchTerm, movie) => {
  try {
    console.log("🔍 updateSearchCount called:", searchTerm);

    const result = await database.listDocuments(
      DATABASE_ID,
      APPWRITE_TABLE,
      [Query.equal("searchTerm", searchTerm)]
    );

    console.log("📄 Query result:", result);

    if (result.total > 0) {
      const doc = result.documents[0];
      const currentCount = Number(doc.count ?? 0);
      const newCount = currentCount + 1;

      await database.updateDocument(DATABASE_ID, APPWRITE_TABLE, doc.$id, {
        count: newCount,
      });

      console.log("✅ Updated count to:", newCount);
    } else {
      console.log("🆕 Creating new document...");

      await database.createDocument(DATABASE_ID, APPWRITE_TABLE, ID.unique(), {
        searchTerm,
        count: 1,
        movie_id: movie.id,
        poster_url: `https://image.tmdb.org/t/p/w500/${movie.poster_path}`,
      });

      console.log("✅ Created new doc for:", searchTerm);
    }
  } catch (error) {
    console.error("❌ updateSearchCount ERROR:", error);
  }
};

const App = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [movieList, setMovieList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm]);

  const fetchMovies = async (query = "") => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const endpoint = query
        ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;

      const response = await fetch(endpoint, API_OPTIONS);

      if (!response.ok) {
        throw new Error("failed");
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        setErrorMessage("No movies found");
        setMovieList([]);
        return;
      }

      setMovieList(data.results);

      if (query && data.results.length > 0) {
        await updateSearchCount(query, data.results[0]);
      }
    } catch (error) {
      console.error(`Error fetching movies: ${error}`);
      setErrorMessage("Error fetching movies");
    } finally {
      setIsLoading(false);
    }
  };

  // prvi load
  useEffect(() => {
    fetchMovies();
  }, []);

  // search sa debounce-om
  useEffect(() => {
    if (!debouncedSearchTerm) return;
    fetchMovies(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  return (
    <main>
      <div className="pattern">
        <div className="wrapper">
          <header>
            <img src="hero.png" alt="hero" className="hero-image" />
            <h1>
              find <span className="text-gradient">Movies</span>
            </h1>
            <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          </header>

          <section className="all-movies">
            <h2 className="mt-[40px]">All movies</h2>

            {isLoading ? (
              <div className="flex items-center justify-center w-56 h-56 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <div role="status">
                  {/* loader svg */}
                </div>
              </div>
            ) : errorMessage ? (
              <p className="text-red-500">{errorMessage}</p>
            ) : (
              <ul>
                {movieList.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default App;
