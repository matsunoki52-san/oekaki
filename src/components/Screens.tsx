import { useEffect, useState } from 'react';
import pkg from '../../package.json';
import { GENRES, artworksOf, type Artwork, type Genre, type GenreId } from '../data/artworks';
import { loadPainting } from '../lib/storage';
import { bgm, sfx } from '../lib/sound';
import { ArtworkSvg } from './ArtworkSvg';
import { BackIcon } from './Icons';

/* ================= ホーム（ジャンル選択） ================= */
export function HomeScreen({ onPick }: { onPick: (g: GenreId) => void }) {
  useEffect(() => {
    bgm.stop();
  }, []);

  return (
    <main className="home">
      <Floaties />
      <h1 className="home__title" aria-label="ぬりえ あそび">
        {'ぬりえ あそび'.split('').map((ch, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.08}s` }} className={ch === ' ' ? 'sp' : ''}>
            {ch}
          </span>
        ))}
        <span style={{ fontSize: '0.4em', verticalAlign: 'super', marginLeft: '10px', color: '#666' }}>v{pkg.version}</span>
      </h1>
      <div className="genres">
        {GENRES.map((g, i) => (
          <GenreButton key={g.id} genre={g} index={i} onClick={() => onPick(g.id)} />
        ))}
      </div>
    </main>
  );
}

function GenreButton({ genre, index, onClick }: { genre: Genre; index: number; onClick: () => void }) {
  return (
    <button
      id={`genre-${genre.id}`}
      className="genre"
      style={{ ['--c' as string]: genre.color, ['--s' as string]: genre.shadow, animationDelay: `${0.15 + index * 0.08}s` }}
      onClick={() => {
        sfx.select();
        if (genre.bgm) {
          bgm.play(genre.bgm);
        }
        onClick();
      }}
    >
      <div className="genre__img-wrap">
        <img src={genre.img} alt="" className="genre__img" draggable={false} />
      </div>
      <span className="genre__label">{genre.title}</span>
    </button>
  );
}

function Floaties() {
  const items = ['⭐', '🌈', '🎨', '✏️', '💖', '☁️', '🌟', '🖍️'];
  return (
    <div className="floaties" aria-hidden="true">
      {items.map((e, i) => (
        <span key={i} style={{ ['--i' as string]: i }}>
          {e}
        </span>
      ))}
    </div>
  );
}

/* ================= 台紙選択 ================= */
export function GalleryScreen({
  genreId,
  onBack,
  onPick,
}: {
  genreId: GenreId;
  onBack: () => void;
  onPick: (a: Artwork) => void;
}) {
  const genre = GENRES.find((g) => g.id === genreId)!;
  const list = artworksOf(genreId);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  // 塗りかけの絵をサムネイルに反映
  useEffect(() => {
    let alive = true;
    const urls: string[] = [];
    Promise.all(list.map(async (a) => [a.id, await loadPainting(a.id)] as const)).then((rows) => {
      if (!alive) return;
      const map: Record<string, string> = {};
      for (const [id, blob] of rows) {
        if (blob) {
          const u = URL.createObjectURL(blob);
          urls.push(u);
          map[id] = u;
        }
      }
      setThumbs(map);
    });
    return () => {
      alive = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [genreId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="gallery" style={{ ['--c' as string]: genre.color, ['--s' as string]: genre.shadow }}>
      <header className="gallery__top">
        <button
          id="btn-gallery-back"
          className="chip-btn chip-btn--round chip-btn--back"
          aria-label="もどる"
          onClick={() => {
            sfx.back();
            onBack();
          }}
        >
          <BackIcon />
        </button>
        <div className="gallery__title">
          <img src={genre.img} alt="" className="gallery__title-img" draggable={false} />
          <span>{genre.title}</span>
        </div>
        <span className="gallery__spacer" />
      </header>
      <div className="cards">
        {list.map((a, i) => (
          <button
            key={a.id}
            id={`art-${a.id}`}
            className="card"
            style={{ animationDelay: `${i * 0.08}s` }}
            onClick={() => {
              sfx.select();
              onPick(a);
            }}
          >
            <span className="card__paper" style={{ aspectRatio: `${a.width} / ${a.height}` }}>
              {thumbs[a.id] && <img className="card__paint" src={thumbs[a.id]} alt="" />}
              <ArtworkSvg artwork={a} strokeWidth={9} className="card__svg" />
            </span>
            <span className="card__label">{a.title}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
