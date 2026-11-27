"use client";

import { useEffect, useRef, useState } from "react";

import StatusCard from "@/components/ui/StatusCard";

interface ServeGalleryImage {
  id: string;
  image_url: string;
  caption: string;
  sort_order: number;
}

const defaultImage: ServeGalleryImage = {
  id: "serve-default-invitation",
  image_url: "/images/serve/40daysbanner.jpeg",
  caption: "“Search the scriptures.” — John 5:39",
  sort_order: 0,
};

export default function ServeImageCarousel() {
  const galleryRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<ServeGalleryImage[]>([defaultImage]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/serve/gallery", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "The SERVE image gallery could not be loaded.");
        return payload as { images: ServeGalleryImage[] };
      })
      .then(({ images: gallery }) => {
        if (!active) return;
        setImages(gallery.length ? gallery : [defaultImage]);
        setActiveIndex(0);
      })
      .catch((caught: unknown) => {
        if (active) setLoadError(caught instanceof Error ? caught.message : "The SERVE image gallery could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = window.setInterval(() => {
      const nextIndex = (activeIndex + 1) % images.length;
      const gallery = galleryRef.current;
      if (gallery) {
        gallery.scrollTo({
          left: gallery.clientWidth * nextIndex,
          behavior: "smooth",
        });
      }
      setActiveIndex(nextIndex);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [activeIndex, images.length]);

  const currentImage = images[activeIndex] ?? defaultImage;

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div
        ref={galleryRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="SERVE image gallery. Scroll horizontally to browse."
        className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto overscroll-x-contain bg-[#06182b] scroll-smooth"
        onScroll={(event) => {
          const element = event.currentTarget;
          const nextIndex = Math.round(element.scrollLeft / element.clientWidth);
          setActiveIndex(Math.min(nextIndex, images.length - 1));
        }}
        tabIndex={0}
      >
        {images.map((image) => (
          <div key={image.id} className="relative h-full min-w-full snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.image_url} alt={image.caption} className="h-full w-full object-contain" />
          </div>
        ))}
      </div>
      <div className="min-h-28 px-2 py-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[.22em] text-[#a5ff00]">The invitation</p>
        <p className="mt-2 text-xl font-bold sm:text-2xl">{currentImage.caption}</p>
        {images.length > 1 ? (
          <>
            <p className="mt-3 text-xs text-white/55" aria-live="polite">Image {activeIndex + 1} of {images.length}</p>
            <p className="mt-1 text-xs text-white/45">Swipe or scroll horizontally to explore</p>
          </>
        ) : null}
      </div>
      {loadError ? (
        <StatusCard kind="warning" title="Showing the default SERVE invitation" description={loadError} />
      ) : null}
    </div>
  );
}
