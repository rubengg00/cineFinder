// --- IMPORTANT ---
// You need to get your own API key from The Movie Database (TMDb).
// Replace "YOUR_TMDB_API_KEY" with your actual key.
const TMDB_API_KEY = "bf6ab1b83f83834f0dde54e1947ba573";
// The region for streaming providers. 'ES' for Spain, 'MX' for Mexico, 'US' for USA, etc.
const STREAMING_REGION = 'ES';
const API_BASE_URL = 'https://api.themoviedb.org/3';

// --- Type Definitions ---
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
    production_companies: { name: string }[];
    production_countries: { iso_3166_1: string, name: string }[];
    created_by?: { name: string }[];
    status: string;
    original_language: string;
    budget?: number;
    revenue?: number;
    number_of_seasons?: number;
    seasons?: { id: number, name: string, season_number: number }[];
}

// --- API Helper Functions ---
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
    const data = await apiFetch(`/${type}/${id}?append_to_response=credits,watch/providers`);
    const providers = data['watch/providers']?.results?.[STREAMING_REGION]?.flatrate || [];
    return { ...data, media_type: type, providers };
};

export const getSeasonDetails = async (tvId: number, seasonNumber: number): Promise<Season> => {
    return apiFetch(`/tv/${tvId}/season/${seasonNumber}`);
};
