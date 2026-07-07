const URL_PATTERN = /^https?:\/\//i;

export const isMediaUrl = (value) =>
  typeof value === 'string' && URL_PATTERN.test(value.trim());

export const getPropertyImages = (property) => {
  if (!property) return [];

  const fromArray = (property.images || []).filter(isMediaUrl);
  if (fromArray.length > 0) return fromArray;

  if (isMediaUrl(property.image)) return [property.image];

  return [];
};

export const getPropertyVideos = (property) => {
  if (!property?.videos?.length) return [];
  return property.videos.filter(isMediaUrl);
};

export const buildPropertyFeatures = (property) => {
  if (!property) return [];

  if (property.features?.length) {
    return [...new Set(property.features.filter(Boolean))];
  }

  const derived = [];

  if (property.bedrooms != null) {
    const label = property.bedrooms === 1 ? '1 bedroom' : `${property.bedrooms} bedrooms`;
    derived.push(label);
  }

  if (property.bathrooms != null) {
    const label = property.bathrooms === 1 ? '1 bathroom' : `${property.bathrooms} bathrooms`;
    derived.push(label);
  }

  if (property.area && property.area !== 'N/A') {
    derived.push(property.area);
  }

  if (property.maxRenters > 1) {
    derived.push(`Up to ${property.maxRenters} renters`);
  }

  return derived;
};

export const formatDescription = (text) => {
  if (!text?.trim()) return [];
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
};

export const getVideoEmbedUrl = (url) => {
  if (!isMediaUrl(url)) return url;

  const trimmed = url.trim();

  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/
  );
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return trimmed;
};
