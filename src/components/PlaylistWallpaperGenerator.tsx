import React, { useState, useRef, useLayoutEffect, useEffect } from 'react'; // Added useEffect

const VITE_SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
// !! WARNING: EXPOSING CLIENT_SECRET IN FRONTEND IS A SEVERE SECURITY RISK !!
const VITE_SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

type WallpaperRatio = 'desktop' | 'mobile';

const PlaylistWallpaperGenerator: React.FC = () => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [submittedPlaylistUrl, setSubmittedPlaylistUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playlistName, setPlaylistName] = useState('');
  const [selectedRatio, setSelectedRatio] = useState<WallpaperRatio>('desktop');
  
  // State for managing Spotify Access Token
  const [spotifyAccessToken, setSpotifyAccessToken] = useState<string | null>(null);
  const tokenExpiresAt = useRef<number>(0); // Timestamp when the token expires

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCache = useRef<{ [key: string]: HTMLImageElement }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Function to get or refresh Spotify Access Token
  const getSpotifyAccessToken = async (): Promise<string> => {
    setError(null); // Clear any previous errors

    // Check if token exists and is not expired (refresh 5 minutes before actual expiry)
    if (spotifyAccessToken && tokenExpiresAt.current > Date.now() + 5 * 60 * 1000) {
      console.log("Using cached Spotify access token.");
      return spotifyAccessToken;
    }

    console.log("Requesting new Spotify access token...");
    try {
      if (!VITE_SPOTIFY_CLIENT_ID || !VITE_SPOTIFY_CLIENT_SECRET) {
        throw new Error("VITE_SPOTIFY_CLIENT_ID o VITE_SPOTIFY_CLIENT_SECRET no configurados en .env.");
      }

      const authString = btoa(`${VITE_SPOTIFY_CLIENT_ID}:${VITE_SPOTIFY_CLIENT_SECRET}`);

      const response = await fetch("http://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${authString}`,
        },
        body: "grant_type=client_credentials",
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching Spotify token:", errorData);
        throw new Error(`Error al obtener el token de Spotify: ${errorData.error_description || response.statusText}`);
      }

      const data = await response.json();
      const newToken = data.access_token;
      const expiresIn = data.expires_in; // Typically 3600 seconds (1 hour)

      setSpotifyAccessToken(newToken);
      tokenExpiresAt.current = Date.now() + expiresIn * 1000; // Store expiry as a timestamp
      console.log("New Spotify access token acquired. Expires in:", expiresIn, "seconds.");
      return newToken;

    } catch (err: any) {
      console.error("Error during Spotify token acquisition:", err);
      setError(`Error al autenticar con Spotify: ${err.message}. ${err.message.includes("CORS") ? "¡Advertencia de CORS! El secreto del cliente no debería estar en el frontend." : ""}`);
      return '';
    }
  };

  const extractPlaylistId = (url: string): string | null => {
    const match = url.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const fetchPlaylistCovers = async (playlistId: string): Promise<string[]> => {
    setIsLoading(true);
    setError(null);
    let allCoverUrls: string[] = [];
    
    try {
      const accessToken = await getSpotifyAccessToken();
      if (!accessToken) {
        throw new Error("No hay token de acceso de Spotify disponible.");
      }

      // Spotify API Endpoints (ensure these are correct for actual use)
      const playlistDetailsUrl = `https://api.spotify.com/v1/playlists/${playlistId}`;
      let tracksUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?offset=0&limit=30`; 

      // Get playlist details for name
      const playlistDetailsResponse = await fetch(playlistDetailsUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!playlistDetailsResponse.ok) {
        const errorData = await playlistDetailsResponse.json();
        throw new Error(`Error al obtener detalles de la playlist: ${errorData.error.message || playlistDetailsResponse.statusText}`);
      }
      const playlistData = await playlistDetailsResponse.json();
      setPlaylistName(playlistData.name || 'Mi Playlist');
      
      // Fetch all tracks' covers (pagination)
      while (tracksUrl) {
        const response = await fetch(tracksUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Error de la API de Spotify al obtener tracks: ${errorData.error.message || response.statusText}`);
        }

        const data = await response.json();
        data.items.forEach((item: any) => {
          if (item.track && item.track.album && item.track.album.images && item.track.album.images.length > 0) {
            const imageUrl = item.track.album.images.find((img: any) => img.width === 300 || img.width === 640)?.url || item.track.album.images[0].url;
            if (imageUrl) {
              allCoverUrls.push(imageUrl);
            }
          }
        });
        tracksUrl = data.next;
      }
      return allCoverUrls;
    } catch (err: any) {
      console.error("Error fetching playlist covers:", err);
      setError(`Error al obtener covers de la playlist: ${err.message}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const loadImages = async (urls: string[]): Promise<HTMLImageElement[]> => {
    const images: HTMLImageElement[] = [];
    const loadPromises = urls.map(url => {
      if (imageCache.current[url]) {
        return Promise.resolve(imageCache.current[url]);
      }
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; 
        img.onload = () => {
          imageCache.current[url] = img;
          images.push(img);
          resolve(img);
        };
        img.onerror = () => {
          console.warn(`Failed to load image: ${url}`);
          resolve(img);
        };
        img.src = url;
      });
    });
    const loadedImages = await Promise.all(loadPromises);
    return loadedImages.filter(img => img.complete && img.naturalWidth > 0);
  };

  const generateWallpaper = (images: HTMLImageElement[], desiredWidth: number, desiredHeight: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = desiredWidth;
    canvas.height = desiredHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, desiredWidth, desiredHeight);
    ctx.fillStyle = 'rgb(15, 15, 15)';
    ctx.fillRect(0, 0, desiredWidth, desiredHeight);

    if (images.length === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '30px "Arial Black", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No se encontraron covers.', desiredWidth / 2, desiredHeight / 2 - 20);
        ctx.font = '20px Arial, sans-serif';
        ctx.fillText('Intenta con otra playlist.', desiredWidth / 2, desiredHeight / 2 + 20);
        return;
    }

    const shuffledImages = [...images].sort(() => 0.5 - Math.random());
    const minCoverSize = 80;
    const maxCoverSize = 200;

    const extendedImages = Array(Math.ceil((desiredWidth * desiredHeight) / (minCoverSize * minCoverSize * 0.5)))
        .fill(0)
        .map((_, i) => shuffledImages[i % shuffledImages.length]);

    for (const img of extendedImages) {
        const size = minCoverSize + Math.random() * (maxCoverSize - minCoverSize);
        const x = Math.random() * (desiredWidth - size);
        const y = Math.random() * (desiredHeight - size);
        const angle = Math.random() * (Math.PI / 6) - (Math.PI / 12);

        ctx.save();
        ctx.translate(x + size / 2, y + size / 2);
        ctx.rotate(angle);
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
    }

    const gradient = ctx.createLinearGradient(0, 0, desiredWidth, desiredHeight);
    gradient.addColorStop(0, 'rgba(0,0,0,0.4)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0.2)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, desiredWidth, desiredHeight);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 72px "Montserrat", sans-serif'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    ctx.fillText(playlistName, desiredWidth / 2, desiredHeight / 2);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${playlistName.replace(/\s/g, '_')}_wallpaper_${selectedRatio}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedPlaylistUrl(playlistUrl);
    setPlaylistName('');
    setError(null);
    
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgb(15, 15, 15)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    const playlistId = extractPlaylistId(playlistUrl);
    if (playlistId) {
      const coverUrls = await fetchPlaylistCovers(playlistId);
      if (coverUrls.length > 0) {
        const loadedImages = await loadImages(coverUrls);
        if (loadedImages.length > 0) {
          let width = 1920;
          let height = 1080;

          if (selectedRatio === 'mobile') {
            width = 1080;
            height = 2160;
          }
          generateWallpaper(loadedImages, width, height);
        } else {
            setError("No se pudieron cargar imágenes de covers de la playlist. Asegúrate de que las imágenes estén disponibles y sean accesibles.");
        }
      } else if (!error) {
        setError("No se encontraron covers en esta playlist o no se pudo acceder a sus tracks. Asegúrate de que la playlist sea pública y contenga canciones.");
      }
    } else {
      setError("URL de Spotify inválida. Asegúrate de que sea un enlace de playlist válido.");
    }
  };

  useLayoutEffect(() => {
    const updateCanvasDisplaySize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        let aspectRatio = selectedRatio === 'desktop' ? 16 / 9 : 1 / 2;
        
        const maxContainerWidth = container.clientWidth - 40;
        const maxContainerHeight = container.clientHeight - 40;

        let newWidth = maxContainerWidth;
        let newHeight = newWidth / aspectRatio;

        if (newHeight > maxContainerHeight) {
          newHeight = maxContainerHeight;
          newWidth = newHeight * aspectRatio;
        }

        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;
      }
    };

    updateCanvasDisplaySize();
    window.addEventListener('resize', updateCanvasDisplaySize);
    return () => window.removeEventListener('resize', updateCanvasDisplaySize);
  }, [submittedPlaylistUrl, selectedRatio]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 w-full font-sans pt-24 pb-12 bg-gradient-to-br from-gray-900 via-stone-950 to-black overflow-hidden">
      <div 
        ref={containerRef}
        className="relative w-full max-w-2xl bg-gradient-to-br from-stone-900/90 to-zinc-950/90 rounded-3xl shadow-2xl shadow-black/50 p-10 flex flex-col items-center justify-center border border-stone-700/70 backdrop-blur-sm transform transition-all duration-300 ease-in-out hover:scale-[1.01] hover:shadow-orange-500/20"
        style={{ minHeight: 'calc(100vh - 12rem)' }} 
      >
        <h1 className="text-5xl md:text-6xl font-extrabold mb-10 text-center tracking-tight text-white drop-shadow-lg leading-tight">
          Generar <span className="text-orange-500">Wallpaper</span>
        </h1>
        <form className="flex flex-col gap-7 w-full max-w-sm" onSubmit={handleSubmit}>
          <input
            type="url"
            placeholder="Pega aquí el link de la playlist de Spotify"
            value={playlistUrl}
            onChange={e => setPlaylistUrl(e.target.value)}
            required
            className="p-4 rounded-full bg-zinc-800 text-white placeholder-gray-400 focus:outline-none focus:ring-3 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-zinc-900 border border-zinc-700 text-lg shadow-inner shadow-black/30 transition-all duration-300 ease-in-out"
          />

          <div className="flex justify-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => setSelectedRatio('desktop')}
              className={`px-6 py-3 rounded-full text-lg font-bold transition-all duration-300 ease-in-out
                ${selectedRatio === 'desktop' ? 'bg-orange-600 text-white shadow-lg' : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'}
                focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-zinc-900`}
            >
              Escritorio (16:9)
            </button>
            <button
              type="button"
              onClick={() => setSelectedRatio('mobile')}
              className={`px-6 py-3 rounded-full text-lg font-bold transition-all duration-300 ease-in-out
                ${selectedRatio === 'mobile' ? 'bg-orange-600 text-white shadow-lg' : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'}
                focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-zinc-900`}
            >
              Móvil (1:2)
            </button>
          </div>

          <button
            type="submit"
            className="relative p-4 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-extrabold text-xl shadow-lg hover:shadow-orange-500/50 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95
                       before:content-[''] before:absolute before:inset-0 before:rounded-full before:bg-white/10 before:blur-sm before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
                       focus:outline-none focus:ring-3 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-zinc-900"
            disabled={isLoading}
          >
            {isLoading ? 'Cargando Covers...' : 'Generar Wallpaper'}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-900/70 rounded-lg text-white text-center text-sm border border-red-700 w-full animate-fade-in">
            <p>{error}</p>
          </div>
        )}

        {submittedPlaylistUrl && (playlistName || isLoading || error) && (
          <div className="mt-10 bg-zinc-900/70 p-7 rounded-2xl text-center break-all w-full shadow-xl shadow-black/40 border border-zinc-800 backdrop-blur-sm animate-fade-in flex flex-col items-center">
            {playlistName && (
              <p className="mb-3 text-xl font-semibold text-white">
                Wallpaper de: <span className="text-orange-400">{playlistName}</span>
              </p>
            )}
            <a
              href={submittedPlaylistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 underline break-all text-base md:text-lg hover:text-orange-300 transition-colors duration-200 mb-4"
            >
              Ver playlist en Spotify
            </a>
            
            {!error ? (
              <>
                <p className="mb-4 text-gray-400 text-sm">
                  Aquí tienes tu wallpaper con covers desordenadas. ¡Haz clic para descargar!
                </p>
                <div className="relative bg-zinc-950 p-2 rounded-lg border border-zinc-700 flex justify-center items-center w-full max-w-full overflow-hidden"
                     style={{ aspectRatio: selectedRatio === 'desktop' ? '16 / 9' : '1 / 2' }}>
                  <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto rounded-md border border-zinc-600 shadow-xl"
                  ></canvas>
                  {isLoading && (
                    <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-white text-xl font-bold rounded-md">
                      Generando imagen...
                    </div>
                  )}
                </div>
                <button
                  onClick={handleDownload}
                  className="mt-6 p-3 rounded-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold text-lg shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-zinc-900 transform hover:scale-105 active:scale-95"
                >
                  Descargar Wallpaper
                </button>
              </>
            ) : (
              <p className="mt-4 text-red-400 text-sm font-medium">
                  {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistWallpaperGenerator;