/* eslint-disable @next/next/no-img-element */
import { imageUrl, isSafeUrl } from "@/lib/format";

interface Props {
  src: string | null | undefined;
  alt: string;
  width?: number; // target display width in CSS px (Cloudinary resizes server-side)
  className?: string;
  priority?: boolean;
}

/**
 * Optimised image: Cloudinary delivers auto-format/quality at the requested widths (1x/2x srcset);
 * images below the fold are lazy-loaded.
 */
export function SmartImage({ src, alt, width = 800, className, priority = false }: Props) {
  if (!isSafeUrl(src)) return null;
  const isCloudinary = src.includes("res.cloudinary.com");
  return (
    <img
      src={imageUrl(src, width)}
      srcSet={isCloudinary ? `${imageUrl(src, width)} 1x, ${imageUrl(src, width * 2)} 2x` : undefined}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      className={className}
    />
  );
}
