import { useState } from 'react';
import type { Artwork, GenreId } from './data/artworks';
import { IconDefs } from './components/Icons';
import { PlayScreen } from './components/PlayScreen';
import { StartScreen, GalleryScreen, HomeScreen } from './components/Screens';

type Screen = { name: 'start' } | { name: 'home' } | { name: 'gallery'; genre: GenreId } | { name: 'play'; genre: GenreId; artwork: Artwork };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'start' });

  return (
    <>
      <IconDefs />
      <div className="screen" key={screen.name + ('artwork' in screen ? screen.artwork.id : '')}>
        {screen.name === 'start' && <StartScreen onStart={() => setScreen({ name: 'home' })} />}
        {screen.name === 'home' && <HomeScreen onPick={(genre) => setScreen({ name: 'gallery', genre })} />}
        {screen.name === 'gallery' && (
          <GalleryScreen
            genreId={screen.genre}
            onBack={() => setScreen({ name: 'home' })}
            onPick={(artwork) => setScreen({ name: 'play', genre: screen.genre, artwork })}
          />
        )}
        {screen.name === 'play' && (
          <PlayScreen artwork={screen.artwork} onBack={() => setScreen({ name: 'gallery', genre: screen.genre })} />
        )}
      </div>
    </>
  );
}
