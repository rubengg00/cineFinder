import React, { useState, useEffect, useCallback, FC } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { MediaDetailsView } from './components/MediaDetailsView';
import { 
    getHomeSections, 
    searchMedia, 
    getMediaDetails, 
    getTMDbImageUrl,
    SearchResult,
    MediaDetails
} from './api/tmdb';

const App: FC = () => {
    const [view, setView] = useState<'home' | 'details'>('home');
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [homeSections, setHomeSections] = useState<{ title: string; items: SearchResult[] }[]>([]);
    const [detailedMedia, setDetailedMedia] = useState<MediaDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    useEffect(() => {
        if (view !== 'home') return;
        const fetchHomeData = async () => {
            setIsLoading(true);
            try {
                const sections = await getHomeSections();
                setHomeSections(sections);
            } catch (err) {
                setError("No se pudo cargar el contenido inicial.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchHomeData();
    }, [view]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) {
            setIsSearching(false);
            setSearchResults([]);
            return;
        }

        setIsLoading(true);
        setError(null);
        setSearchResults([]);
        setIsSearching(true);

        try {
            const geminiResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Analiza la siguiente petición de un usuario sobre películas o series: "${query}". Extrae las palabras clave más efectivas para buscar en una base de datos de películas.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: { search_query: { type: Type.STRING } }
                    }
                }
            });
            const { search_query } = JSON.parse(geminiResponse.text);
            if (!search_query) throw new Error("No se pudieron generar términos de búsqueda.");
            
            const results = await searchMedia(search_query);
            setSearchResults(results);
            if (results.length === 0) setError("No se encontraron resultados.");

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
            setError(`Error: ${message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectMedia = useCallback(async (media: { id: number; type: 'movie' | 'tv' }) => {
        setIsLoading(true);
        setError(null);
        setDetailedMedia(null);
        try {
            const data = await getMediaDetails(media.id, media.type);
            setDetailedMedia(data);
            setView('details');
            window.scrollTo(0, 0);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
            setError(`Error: ${message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleBack = () => {
        setView('home');
        setDetailedMedia(null);
        setError(null);
        setIsSearching(false);
        setQuery('');
    };
    
    return (
        <div className={view === 'details' ? "full-width-container" : "app-container"}>
            {view === 'home' ? (
                <>
                    <header className="header">
                        <h1>Cine-Finder</h1>
                        <p>Encuentra información sobre tus películas y series favoritas.</p>
                    </header>
                    <form className="search-form" onSubmit={handleSearch}>
                        <input
                            type="text"
                            className="search-input"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Busca por título, actor, género..."
                            aria-label="Buscar películas y series"
                        />
                        <button type="submit" className="search-button" disabled={isLoading}>Buscar</button>
                    </form>

                    {isLoading && <div className="loader">Cargando...</div>}
                    {error && <div className="message error">{error}</div>}

                    {!isSearching ? (
                        homeSections.map(section => (
                            <section key={section.title} className="home-section">
                                <h2 className="home-section-title">{section.title}</h2>
                                <div className="media-carousel">
                                    {section.items.map(item => (
                                        <div key={item.id} className="card" onClick={() => handleSelectMedia({ id: item.id, type: item.media_type })} role="button" tabIndex={0}>
                                            <img src={getTMDbImageUrl(item.poster_path!, 'w500')} alt={item.title || item.name} />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))
                    ) : (
                        <div className="results-grid">
                            {searchResults.map(item => (
                                <div key={item.id} className="card" onClick={() => handleSelectMedia({ id: item.id, type: item.media_type })} role="button" tabIndex={0}>
                                    <img src={getTMDbImageUrl(item.poster_path!, 'w500')} alt={item.title || item.name} />
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : detailedMedia ? (
                <MediaDetailsView media={detailedMedia} onBack={handleBack} />
            ) : (
                isLoading ? <div className="loader">Cargando detalles...</div> : 
                <div className="message error">
                    {error || "No se pudo cargar el contenido."}
                    <button onClick={handleBack} className="back-button" style={{position: 'static', marginTop: '1rem'}}>&larr; Volver</button>
                </div>
            )}
        </div>
    );
};

export { App };
