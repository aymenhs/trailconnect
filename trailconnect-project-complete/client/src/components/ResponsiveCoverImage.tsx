import React, { type ImgHTMLAttributes } from "react";

type CoverVariant = {
  mobile: string;
  desktop: string;
};

// Keys match the shipped filenames in `client/public/media/`. They used to end
// in `_`, which was the separator before the Manus storage hash suffix
// (`trailconnect-hero_38eee418.jpg`); the assets are served locally now and
// carry no hash, so the trailing underscore would never match again.
const coverVariants: Record<string, CoverVariant> = {
  "trailconnect-hero": {
    mobile: "/media/trailconnect-hero-mobile.webp",
    desktop: "/media/trailconnect-hero-desktop.webp",
  },
  "trailconnect-event-alpine": {
    mobile: "/media/trailconnect-alpine-mobile.webp",
    desktop: "/media/trailconnect-alpine-desktop.webp",
  },
  "trailconnect-event-ridge": {
    mobile: "/media/trailconnect-ridge-mobile.webp",
    desktop: "/media/trailconnect-ridge-desktop.webp",
  },
};

function findVariant(src: string) {
  return Object.entries(coverVariants).find(([key]) => src.includes(key))?.[1];
}

type ResponsiveCoverImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  src: string;
  priority?: boolean;
  focalX?: number | null;
  focalY?: number | null;
};

export function getCoverObjectPosition(
  focalX?: number | null,
  focalY?: number | null
) {
  return typeof focalX === "number" && typeof focalY === "number"
    ? `${focalX}% ${focalY}%`
    : "50% 50%";
}

export function ResponsiveCoverImage({
  src,
  alt,
  priority = false,
  sizes = "100vw",
  focalX,
  focalY,
  ...imageProps
}: ResponsiveCoverImageProps) {
  const variant = findVariant(src);
  const fallback = variant?.desktop ?? src;

  return (
    <picture>
      {variant && <source media="(max-width: 767px)" srcSet={variant.mobile} />}
      {variant && (
        <source media="(min-width: 768px)" srcSet={variant.desktop} />
      )}
      <img
        {...imageProps}
        src={fallback}
        alt={alt}
        sizes={sizes}
        style={{
          ...imageProps.style,
          objectPosition: getCoverObjectPosition(focalX, focalY),
        }}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}

export const trailConnectCoverVariants = coverVariants;
