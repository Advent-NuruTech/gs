"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
      setActiveIndex((current) => (current + 1) % images.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [images.length]);

  const currentImage = images[activeIndex] ?? defaultImage;

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#06182b]">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImage.id}
            src={currentImage.image_url}
            alt={currentImage.caption}
            className="absolute inset-0 h-full w-full object-contain"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          />
        </AnimatePresence>
      </div>
      <div className="min-h-28 px-2 py-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[.22em] text-[#a5ff00]">The invitation</p>
        <p className="mt-2 text-xl font-bold sm:text-2xl">{currentImage.caption}</p>
        {images.length > 1 ? (
          <p className="mt-3 text-xs text-white/55" aria-live="polite">
            Image {activeIndex + 1} of {images.length}
          </p>
        ) : null}
      </div>
      {loadError ? (
        <StatusCard kind="warning" title="Showing the default SERVE invitation" description={loadError} />
      ) : null}
    </div>
  );
}
