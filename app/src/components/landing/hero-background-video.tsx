"use client";

import { useState } from "react";

const YOUTUBE_VIDEO_ID = "UX0IvL7oJn0";

/** Vídeo de fundo do hero da landing (prédio do InovAMF), decorativo:
 * sem áudio, sem controles, sem poder pausar/clicar (`pointer-events-none`
 * no iframe). Enquanto o iframe carrega, mostra o gradiente de marca no
 * lugar — troca pro vídeo com um fade suave assim que ele confirma que
 * carregou. Um filtro escuro por cima garante contraste pro texto do
 * hero em qualquer trecho do vídeo. */
export function HeroBackgroundVideo() {
  const [isVideoReady, setIsVideoReady] = useState(false);

  return (
    <div className="absolute inset-0 overflow-hidden bg-brand-900">
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${isVideoReady ? "opacity-0" : "opacity-100"}`}
        style={{ background: "linear-gradient(135deg, #4A0E1A 0%, #D62027 55%, #F7941D 100%)" }}
      />

      <div
        className={`absolute inset-0 transition-opacity duration-700 ${isVideoReady ? "opacity-100" : "opacity-0"}`}
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${YOUTUBE_VIDEO_ID}&controls=0&showinfo=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&rel=0&playsinline=1`}
            title=""
            allow="autoplay; encrypted-media"
            tabIndex={-1}
            onLoad={() => setIsVideoReady(true)}
          />
        </div>
      </div>

      {/* Filtro escuro por cima do vídeo/gradiente pra manter o texto legível. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(74,14,26,0.8) 0%, rgba(214,32,39,0.6) 55%, rgba(247,148,29,0.5) 100%)",
        }}
      />
    </div>
  );
}
