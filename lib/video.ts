export function youtubeId(url: string | null) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
export function vimeoId(url: string | null) {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}
export function embedUrl(url: string | null) {
  const y = youtubeId(url);
  if (y) return `https://www.youtube-nocookie.com/embed/${y}`;
  const v = vimeoId(url);
  if (v) return `https://player.vimeo.com/video/${v}`;
  return null;
}
export function thumbnail(url: string | null) {
  const y = youtubeId(url);
  return y ? `https://img.youtube.com/vi/${y}/hqdefault.jpg` : null;
}
