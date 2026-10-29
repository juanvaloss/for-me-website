import { GarmentArt } from "./GarmentArt";

interface ProductPhotoProps {
  photo: string;
  alt: string;
  category: string;
  colorHex: string;
  className?: string;
  eager?: boolean;
}

/** Catalog photo, or the drawn silhouette in its color when a color has no photo yet. */
export function ProductPhoto({
  photo,
  alt,
  category,
  colorHex,
  className,
  eager = false,
}: ProductPhotoProps) {
  if (!photo) {
    return <GarmentArt className={className} category={category} color={colorHex} />;
  }
  return (
    <img
      src={photo}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
