import React, { FC, useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- API and Types ---

const TMDB_API_KEY = "bf6ab1b83f83834f0dde54e1947ba573";
const STREAMING_REGION = 'ES';
const API_BASE_URL = 'https://api.themoviedb.org/3';

export interface SearchResult {
    id: number;
    media_type: 'movie' | 'tv';
    title?: string;
    name?: string;
    poster_path: string | null;
}
export interface StreamingProvider {
    provider_id: number;
    provider_name: string;
    logo_path: string;
}
export interface Cast {
    id: number;
    name: string;
    profile_path: string | null;
    character: string;
}
export interface Crew {
    job: string;
    name: string;
}
export interface Episode {
    id: number;
    name: string;
    episode_number: number;
    overview: string;
}
export interface Season {
    id: number;
    name: string;
    season_number: number;
    episodes: Episode[];
}
export interface Video {
    key: string;
    site: string;
    type: string;
}
export interface MediaDetails {
    id: number;
    media_type: 'movie' | 'tv';
    title?: string;
    name?: string;
    original_title?: string;
    original_name?: string;
    poster_path: string | null;
    backdrop_path: string | null;
    overview: string;
    vote_average: number;
    vote_count: number;
    release_date?: string;
    first_air_date?: string;
    genres: { name: string }[];
    runtime?: number;
    episode_run_time?: number[];
    credits: { cast: Cast[], crew: Crew[] };
    providers: StreamingProvider[];
    watchProviderLink?: string;
    production_companies: { name: string }[];
    production_countries: { iso_3166_1: string, name: string }[];
    created_by?: { name: string }[];
    status: string;
    original_language: string;
    budget?: number;
    revenue?: number;
    number_of_seasons?: number;
    seasons?: { id: number, name: string, season_number: number }[];
    videos: { results: Video[] };
}

export const getTMDbImageUrl = (path: string | null, size = 'w500') => path ? `https://image.tmdb.org/t/p/${size}${path}` : `https://via.placeholder.com/${size.substring(1)}x${parseInt(size.substring(1)) * 1.5}?text=No+Image`;

const apiFetch = async (endpoint: string) => {
    const url = `${API_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}&language=es-ES`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error fetching from TMDB: ${response.statusText}`);
    }
    return response.json();
};

export const getHomeSections = async () => {
    const endpoints = [
        { title: "Películas Populares", path: "/movie/popular" },
        { title: "Series Populares", path: "/tv/popular" },
        { title: "Películas Mejor Valoradas", path: "/movie/top_rated" },
    ];
    const promises = endpoints.map(ep => 
        apiFetch(ep.path).then(data => ({
            title: ep.title,
            items: data.results.map((item: any) => ({
                ...item,
                media_type: ep.path.includes('movie') ? 'movie' : 'tv'
            })).filter((i: SearchResult) => i.poster_path)
        }))
    );
    return Promise.all(promises);
};

export const searchMedia = async (query: string): Promise<SearchResult[]> => {
    const data = await apiFetch(`/search/multi?query=${encodeURIComponent(query)}`);
    return data.results.filter((item: SearchResult) => 
        (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path
    );
};

export const getMediaDetails = async (id: number, type: 'movie' | 'tv'): Promise<MediaDetails> => {
    const data = await apiFetch(`/${type}/${id}?append_to_response=credits,watch/providers,videos`);
    const providers = data['watch/providers']?.results?.[STREAMING_REGION]?.flatrate || [];
    const watchProviderLink = data['watch/providers']?.results?.[STREAMING_REGION]?.link;
    return { ...data, media_type: type, providers, watchProviderLink };
};

export const getSeasonDetails = async (tvId: number, seasonNumber: number): Promise<Season> => {
    return apiFetch(`/tv/${tvId}/season/${seasonNumber}`);
};

// --- Components ---

const getFlagUrl = (countryCode: string) => `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'No disponible';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}
const getDirector = (crew: { job: string, name: string }[]) => crew.find(c => c.job === 'Director')?.name;

const ScoreCircle: FC<{ score: number }> = ({ score }) => {
    const percentage = Math.round(score * 10);
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const getScoreColor = (p: number) => {
        if (p < 50) return '#d32f2f'; // Red
        if (p < 70) return '#fdd835'; // Yellow
        return '#03dac6'; // Green/Primary
    };
    const color = getScoreColor(percentage);

    return (
        <div className="score-container">
            <div className="score-visual">
                <svg className="score-svg" width="80" height="80" viewBox="0 0 80 80">
                    <circle className="score-bg" cx="40" cy="40" r={radius} />
                    <circle
                        className="score-fg"
                        cx="40"
                        cy="40"
                        r={radius}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ stroke: color }}
                    />
                </svg>
                <div className="score-text">
                    {percentage}<span className="score-percent">%</span>
                </div>
            </div>
            <span className="score-label">Puntuación<br/>de usuarios</span>
        </div>
    );
};

const CastCarousel: FC<{ cast: Cast[] }> = ({ cast }) => (
    <div className="cast-carousel-container">
        <h2>Reparto principal</h2>
        <div className="cast-carousel">
            {cast.slice(0, 15).map(member => (
                <div key={member.id} className="cast-member">
                    <img src={getTMDbImageUrl(member.profile_path, 'w300')} alt={member.name}/>
                    <div className="cast-member-info">
                        <p className="cast-member-name">{member.name}</p>
                        <p className="cast-member-character">{member.character}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const MediaDetailsView: FC<{ media: MediaDetails; onBack: () => void }> = ({ media, onBack }) => {
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);
    const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (media.media_type === 'tv' && media.seasons) {
            const fetchSeasons = async () => {
                setIsLoadingSeasons(true);
                try {
                    const seasonPromises = media.seasons!
                        .filter(s => s.season_number > 0)
                        .map(s => getSeasonDetails(media.id, s.season_number));
                    const detailedSeasons = await Promise.all(seasonPromises);
                    setSeasons(detailedSeasons);
                } catch (error) {
                    console.error("Failed to fetch season details", error);
                } finally {
                    setIsLoadingSeasons(false);
                }
            };
            fetchSeasons();
        }
    }, [media]);

    const toggleSeason = (seasonId: number) => {
        setExpandedSeasons(prev => {
            const newSet = new Set(prev);
            if (newSet.has(seasonId)) {
                newSet.delete(seasonId);
            } else {
                newSet.add(seasonId);
            }
            return newSet;
        });
    };

    const directorOrCreator = getDirector(media.credits.crew) || media.created_by?.[0]?.name;
    const trailer = media.videos?.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
    const streamingProviderLink = media.watchProviderLink;

    return (
        <>
            <div className="detail-view-wrapper" style={{backgroundImage: `url(${getTMDbImageUrl(media.backdrop_path, 'original')})`}}>
                <button onClick={onBack} className="back-button">&larr; Volver</button>
                <div className="detail-view-overlay">
                    <div className="detail-content">
                        <div className="detail-left-pane">
                            <img className="detail-poster" src={getTMDbImageUrl(media.poster_path, 'w500')} alt={media.title || media.name} />
                            {media.providers.length > 0 && (
                                <a href={streamingProviderLink} target="_blank" rel="noopener noreferrer" className="streaming-link">
                                    <div className="streaming-now-box">
                                        <img src={getTMDbImageUrl(media.providers[0].logo_path, 'w92')} alt={media.providers[0].provider_name} />
                                        <p>Ahora en retransmisión</p>
                                        <span>Ver ahora</span>
                                    </div>
                                </a>
                            )}
                        </div>
                        <div className="detail-right-pane">
                            <h1 className="detail-title">
                                {media.title || media.name}
                                <span className="detail-year">({(media.release_date || media.first_air_date)?.substring(0, 4)})</span>
                            </h1>
                            <div className="detail-genres">
                                {media.genres.map(g => g.name).join(', ')}
                            </div>
                            
                            <div className="actions-and-score">
                                {media.vote_count > 0 && <ScoreCircle score={media.vote_average} />}
                                {trailer && (
                                    <a href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noopener noreferrer" className="trailer-button">
                                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                                        Reproducir tráiler
                                    </a>
                                )}
                            </div>
                            
                            <h3 className="detail-overview-title">Vista general</h3>
                            <p className="detail-overview">{media.overview || "No hay sinopsis disponible."}</p>

                            {directorOrCreator && (
                                <div className="detail-creator">
                                    <p className="creator-name">{directorOrCreator}</p>
                                    <p className="creator-label">{media.media_type === 'movie' ? 'Director' : 'Creador'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <div style={{ backgroundColor: '#fff' }}>
                <div className="additional-details-section">
                    <CastCarousel cast={media.credits.cast} />
                    <div className={`more-info-section ${media.media_type === 'movie' ? 'movie-layout' : ''}`}>
                        <div className="more-info-main">
                            {media.media_type === 'tv' && (
                                <div className="seasons-container">
                                    <h3>Temporadas y Episodios</h3>
                                    {isLoadingSeasons ? <p>Cargando episodios...</p> : seasons.map(season => (
                                        <div key={season.id}>
                                            <button className="season-header" onClick={() => toggleSeason(season.id)}>
                                                {season.name}
                                                <span className={`season-caret ${expandedSeasons.has(season.id) ? 'expanded' : ''}`}>&#9660;</span>
                                            </button>
                                            <ul className={`episodes-list ${expandedSeasons.has(season.id) ? 'expanded' : ''}`}>
                                                {season.episodes.map(ep => (
                                                    <li key={ep.id} className="episode-item">
                                                        <div className="episode-number">{ep.episode_number}</div>
                                                        <div className="episode-info">
                                                            <p className="episode-title">{ep.name}</p>
                                                            <p className="episode-overview">{ep.overview || "No hay sinopsis para este episodio."}</p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="more-info-sidebar">
                            <h3>Información</h3>
                            <strong>Título original</strong>
                            <p>{media.original_title || media.original_name}</p>
                            <strong>Estado</strong>
                            <p>{media.status}</p>
                            <strong>País</strong>
                            {media.production_countries.map(country => (
                                <p key={country.iso_3166_1}>
                                    <img src={getFlagUrl(country.iso_3166_1)} alt={country.name} className="flag" />
                                    {country.name}
                                </p>
                            ))}
                            <strong>Idioma original</strong>
                            <p>{media.original_language.toUpperCase()}</p>
                            {media.media_type === 'movie' && <>
                                <strong>Presupuesto</strong>
                                <p>{formatCurrency(media.budget)}</p>
                                <strong>Ingresos</strong>
                                <p>{formatCurrency(media.revenue)}</p>
                            </>}
                            {media.media_type === 'tv' && <>
                                <strong>Temporadas</strong>
                                <p>{media.number_of_seasons}</p>
                            </>}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// --- App Component ---

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
                        <div className="header-title-container">
                            <svg className="app-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                            <h1>Cine-Finder</h1>
                        </div>
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

// --- App Initialization ---
const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);