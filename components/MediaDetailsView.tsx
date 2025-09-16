import React, { FC, useEffect, useState } from 'react';
import { MediaDetails, Cast, getTMDbImageUrl, getSeasonDetails, Season } from '../api/tmdb';

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

export const MediaDetailsView: FC<{ media: MediaDetails; onBack: () => void }> = ({ media, onBack }) => {
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);

    useEffect(() => {
        if (media.media_type === 'tv' && media.seasons) {
            const fetchSeasons = async () => {
                setIsLoadingSeasons(true);
                try {
                    const seasonPromises = media.seasons!
                        .filter(s => s.season_number > 0) // Exclude "Specials" season
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

    const directorOrCreator = getDirector(media.credits.crew) || media.created_by?.[0]?.name;

    return (
        <>
            <div className="detail-view-wrapper" style={{backgroundImage: `url(${getTMDbImageUrl(media.backdrop_path, 'original')})`}}>
                <button onClick={onBack} className="back-button">&larr; Volver</button>
                <div className="detail-view-overlay">
                    <div className="detail-content">
                        <div className="detail-left-pane">
                            <img className="detail-poster" src={getTMDbImageUrl(media.poster_path, 'w500')} alt={media.title || media.name} />
                            {media.providers.length > 0 && (
                                <div className="streaming-now-box">
                                    <img src={getTMDbImageUrl(media.providers[0].logo_path, 'w92')} alt={media.providers[0].provider_name} />
                                    <p>Ahora en retransmisión</p>
                                    <span>Ver ahora</span>
                                </div>
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
                            
                            {media.vote_count > 0 && (
                                <div className="actions-and-score">
                                    <ScoreCircle score={media.vote_average} />
                                </div>
                            )}
                            
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
                    <div className="more-info-section">
                        <div className="more-info-main">
                            <CastCarousel cast={media.credits.cast} />
                            {media.media_type === 'tv' && (
                                <div className="seasons-container">
                                    <h3>Temporadas y Episodios</h3>
                                    {isLoadingSeasons ? <p>Cargando episodios...</p> : seasons.map(season => (
                                        <div key={season.id}>
                                            <h4>{season.name}</h4>
                                            <ul className="episodes-list">
                                                {season.episodes.map(ep => (
                                                    <li key={ep.id}><strong>{ep.episode_number}. {ep.name}</strong></li>
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