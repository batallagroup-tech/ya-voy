// Optimiza URLs de Cloudinary con transformaciones automáticas
// width: ancho máximo en px | quality: auto | format: auto (webp/avif)
export function imgUrl(url: string | undefined | null, width = 400): string {
  if (!url) return "";
  // Solo transforma URLs de Cloudinary
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
}
