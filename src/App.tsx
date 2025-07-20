// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import SpectrogramGenerator from './components/SpectrogramGenerator';
import PlaylistWallpaperGenerator from './components/PlaylistWallpaperGenerator';
import './index.css'; // Your global CSS, including Tailwind directives

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-stone-950 to-black text-white">
        {/* Navbar - Fixed at the top */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-md shadow-lg py-4 px-8 flex justify-center items-center border-b border-zinc-800">
          <ul className="flex space-x-8">
            <li>
              <Link
                to="/wave" // Link to the root path for Spectrogram
                className="text-lg font-semibold transition-colors duration-200 ease-in-out text-gray-300 hover:text-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-zinc-950 rounded-md px-3 py-1"
              >
                Generar Espectrograma
              </Link>
            </li>
            <li>
              <Link
                to="/" // Link to the /wallpaper path
                className="text-lg font-semibold transition-colors duration-200 ease-in-out text-gray-300 hover:text-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-zinc-950 rounded-md px-3 py-1"
              >
                Generar Wallpaper
              </Link>
            </li>
          </ul>
        </nav>

        {/* Main content area, with padding for the fixed navbar */}
        <main className="pt-24">
          <Routes>
            <Route path="/wave" element={<SpectrogramGenerator />} />
            <Route path="/" element={<PlaylistWallpaperGenerator />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;