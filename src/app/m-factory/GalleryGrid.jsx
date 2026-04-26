"use client";
import { useState, useEffect } from "react";

const GALLERY_CSS = `
.mf-gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
/* desktop spans */
.mf-gallery .gc-2 { grid-column: span 2; aspect-ratio: 16/7; }
.mf-gallery .gc-1 { grid-column: span 1; aspect-ratio: 4/3; }

/* tablet: 2 cols */
@media (max-width: 768px) {
  .mf-gallery { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
  .mf-gallery .gc-2 { grid-column: span 2; aspect-ratio: 2/1; }
  .mf-gallery .gc-1 { grid-column: span 1; aspect-ratio: 1/1; }
}
/* mobile: 1 col */
@media (max-width: 480px) {
  .mf-gallery { grid-template-columns: 1fr; }
  .mf-gallery .gc-2,
  .mf-gallery .gc-1 { grid-column: span 1; aspect-ratio: 16/9; }
}
.mf-gallery-card {
  border-radius: 1.25rem;
  overflow: hidden;
  background: #cbd5e1;
  position: relative;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(15,23,42,0.09);
  transition: transform 0.35s ease, box-shadow 0.35s ease;
}
.mf-gallery-card:hover {
  transform: scale(1.025);
  box-shadow: 0 20px 50px rgba(15,23,42,0.17), 0 6px 18px rgba(0,0,0,0.11);
}
.mf-gallery-card img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
  transition: transform 0.5s ease;
}
.mf-gallery-card:hover img { transform: scale(1.07); }
.mf-gallery-card .overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(10,15,30,0.42) 0%, transparent 55%);
  opacity: 0;
  transition: opacity 0.3s ease;
}
.mf-gallery-card:hover .overlay { opacity: 1; }
`;

let _injected = false;
function injectStyle() {
  if (_injected || typeof document === "undefined") return;
  const s = document.createElement("style");
  s.textContent = GALLERY_CSS;
  document.head.appendChild(s);
  _injected = true;
}

/* Layout: row1 [wide, tall], row2 [3 equal], row3 [tall, wide], row4 [extra 3] */
const IMAGES = [
  { src: "/m-factory/LINE_ALBUM_12369_260417_1.jpg", cls: "gc-2" },
  { src: "/m-factory/LINE_ALBUM_12369_260417_2.jpg", cls: "gc-1" },
  { src: "/m-factory/LINE_ALBUM_12369_260417_3.jpg", cls: "gc-1" },
  { src: "/m-factory/LINE_ALBUM_12369_260417_4.jpg", cls: "gc-1" },
  { src: "/m-factory/LINE_ALBUM_12369_260417_5.jpg", cls: "gc-1" },
  { src: "/m-factory/LINE_ALBUM_12369_260417_6.jpg", cls: "gc-1" },
  { src: "/m-factory/LINE_ALBUM_12369_260417_7.jpg", cls: "gc-2" },
  { src: "/m-factory/13976.jpg",       cls: "gc-1" },
  { src: "/m-factory/S__26886151.jpg", cls: "gc-1" },
  { src: "/m-factory/S__27058264.jpg", cls: "gc-1" },
];

export default function GalleryGrid() {
  useEffect(() => { injectStyle(); }, []);
  return (
    <div className="mf-gallery">
      {IMAGES.map(({ src, cls }) => (
        <div key={src} className={`mf-gallery-card ${cls}`}>
          <img
            src={src}
            alt="M-Factory"
          />
          <div className="overlay" />
        </div>
      ))}
    </div>
  );
}
