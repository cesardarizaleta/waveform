// src/components/Navbar.tsx
import React from 'react';

interface NavbarProps {
  onNavigate: (section: string) => void;
  activeSection: string;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, activeSection }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-md shadow-lg py-4 px-8 flex justify-center items-center border-b border-zinc-800">
      <ul className="flex space-x-8">
        <li>
          <button
            onClick={() => onNavigate('wave')}
            className={`text-lg font-semibold transition-colors duration-200 ease-in-out
              ${activeSection === 'wave' ? 'text-orange-500 hover:text-orange-400' : 'text-gray-300 hover:text-white'}
              focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-zinc-950 rounded-md px-3 py-1`}
          >
            Generar Espectrograma
          </button>
        </li>
        <li>
          <button
            onClick={() => onNavigate('')}
            className={`text-lg font-semibold transition-colors duration-200 ease-in-out
              ${activeSection === '' ? 'text-orange-500 hover:text-orange-400' : 'text-gray-300 hover:text-white'}
              focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-zinc-950 rounded-md px-3 py-1`}
          >
            Generar Wallpaper
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;