import NextImage, { type ImageProps } from "next/image";

/**
 * Convex `storage.getUrl()` URLs behave like a normal `img` `src`.
 * The default `next/image` optimizer can fail for some uploads (SVG, uncommon codecs).
 * Skipping optimization restores reliable rendering for user uploads.
 */
export function ConvexImage(props: ImageProps) {
  return <NextImage {...props} unoptimized />;
}
