import React, { useState, useRef, useEffect } from 'react';

// Accede a las variables de entorno de Vite
const VITE_SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
// Recordatorio: VITE_SPOTIFY_CLIENT_SECRET NO debe usarse directamente en el frontend.
// Se asume que VITE_SPOTIFY_TOKEN es el access_token ya generado para pruebas locales.

const SpectrogramGenerator: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [spectrogramUrl, setSpectrogramUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (audioFile) {
      const formData = new FormData();
      formData.append('file', audioFile);

      // Llama a tu endpoint de Flask aquí
      fetch('http://127.0.0.1:5000/generate_spectrogram', {
        method: 'POST',
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.spectrogram_url) {
            setSpectrogramUrl(data.spectrogram_url);
          } else {
            console.error('Error: La respuesta no contiene la URL del espectrograma.', data);
          }
        })
        .catch((error) => {
          console.error('Error al generar el espectrograma:', error);
        });
    }
  }, [audioFile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setAudioFile(files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <h1>Generador de Espectrogramas</h1>
      <input
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        ref={fileInputRef}
      />
      <button onClick={handleUploadClick}>Subir archivo de audio</button>

      {audioFile && <p>Archivo seleccionado: {audioFile.name}</p>}

      {spectrogramUrl && (
        <div>
          <h2>Espectrograma generado:</h2>
          <img src={spectrogramUrl} alt="Espectrograma" />
        </div>
      )}
    </div>
  );
};

export default SpectrogramGenerator;
