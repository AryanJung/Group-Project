const PRICE_PATTERN = /[\d,]+(?:\.\d+)?/;
const AREA_PATTERN = /[\d,]+(?:\.\d+)?/;

const normalizeText = (value) => String(value || '').trim().toLowerCase();

export const extractNumericPrice = (price) => {
  if (typeof price === 'number') return price;
  if (!price) return 0;

  const match = String(price).match(PRICE_PATTERN);
  if (!match) return 0;

  return Number.parseFloat(match[0].replace(/,/g, '')) || 0;
};

export const extractAreaValue = (area) => {
  if (typeof area === 'number') return area;
  if (!area) return 0;

  const match = String(area).match(AREA_PATTERN);
  if (!match) return 0;

  return Number.parseFloat(match[0].replace(/,/g, '')) || 0;
};

export const hasBrowseFilters = (filters = {}) =>
  Boolean(
    normalizeText(filters.searchQuery) ||
      normalizeText(filters.locationFilter) ||
      normalizeText(filters.minPrice) ||
      normalizeText(filters.maxPrice) ||
      normalizeText(filters.bedroomsFilter) ||
      normalizeText(filters.bathroomsFilter)
  );

export const getSearchablePropertyText = (property) =>
  [
    property?.title,
    property?.location,
    property?.description,
    property?.area,
    property?.bedrooms != null ? `${property.bedrooms} bedrooms` : '',
    property?.bathrooms != null ? `${property.bathrooms} bathrooms` : '',
    ...(property?.features || []),
    property?.type,
  ]
    .filter(Boolean)
    .map(normalizeText)
    .join(' ');

export const filterPropertiesByBrowseFilters = (properties = [], filters = {}) => {
  const query = normalizeText(filters.searchQuery);
  const locationFilter = normalizeText(filters.locationFilter);
  const minPrice = Number.parseFloat(filters.minPrice);
  const maxPrice = Number.parseFloat(filters.maxPrice);
  const bedroomsFilter = Number.parseInt(filters.bedroomsFilter, 10);
  const bathroomsFilter = Number.parseInt(filters.bathroomsFilter, 10);

  return properties.filter((property) => {
    if (query && !getSearchablePropertyText(property).includes(query)) {
      return false;
    }

    if (locationFilter && normalizeText(property.location) !== locationFilter) {
      return false;
    }

    const propertyPrice = extractNumericPrice(property.price ?? property.rawPrice);
    if (!Number.isNaN(minPrice) && filters.minPrice !== '' && propertyPrice < minPrice) {
      return false;
    }
    if (!Number.isNaN(maxPrice) && filters.maxPrice !== '' && propertyPrice > maxPrice) {
      return false;
    }

    if (!Number.isNaN(bedroomsFilter) && filters.bedroomsFilter !== '' && (property.bedrooms ?? 0) < bedroomsFilter) {
      return false;
    }

    if (!Number.isNaN(bathroomsFilter) && filters.bathroomsFilter !== '' && (property.bathrooms ?? 0) < bathroomsFilter) {
      return false;
    }

    return true;
  });
};

export const sortPropertiesByNewest = (properties = []) =>
  [...properties].sort((left, right) => {
    const leftTime = new Date(left?.createdAt || left?.updatedAt || 0).getTime();
    const rightTime = new Date(right?.createdAt || right?.updatedAt || 0).getTime();
    return rightTime - leftTime;
  });

const getFilterMatchScore = (property, filters = {}) => {
  let score = 0;

  const query = normalizeText(filters.searchQuery);
  const locationFilter = normalizeText(filters.locationFilter);
  const propertyText = getSearchablePropertyText(property);

  if (query) {
    if (propertyText.includes(query)) score += 4;
    if (normalizeText(property.title).includes(query)) score += 2;
    if (normalizeText(property.location).includes(query)) score += 2;
  }

  if (locationFilter) {
    if (normalizeText(property.location) === locationFilter) score += 8;
    else if (normalizeText(property.location).includes(locationFilter)) score += 4;
  }

  const targetPrice = Number.parseFloat(filters.maxPrice || filters.minPrice);
  const propertyPrice = extractNumericPrice(property.price ?? property.rawPrice);
  if (!Number.isNaN(targetPrice) && targetPrice > 0 && propertyPrice > 0) {
    const distance = Math.abs(propertyPrice - targetPrice);
    score += Math.max(0, 8 - distance / Math.max(targetPrice, 1));
  }

  const bedroomsFilter = Number.parseInt(filters.bedroomsFilter, 10);
  if (!Number.isNaN(bedroomsFilter)) {
    const bedrooms = property.bedrooms ?? 0;
    if (bedrooms >= bedroomsFilter) {
      score += bedrooms === bedroomsFilter ? 6 : 3;
    }
  }

  const bathroomsFilter = Number.parseInt(filters.bathroomsFilter, 10);
  if (!Number.isNaN(bathroomsFilter)) {
    const bathrooms = property.bathrooms ?? 0;
    if (bathrooms >= bathroomsFilter) {
      score += bathrooms === bathroomsFilter ? 6 : 3;
    }
  }

  const areaValue = extractAreaValue(property.area);
  if (areaValue > 0) {
    score += Math.min(areaValue / 1000, 4);
  }

  if (property.features?.length) {
    score += Math.min(property.features.length, 4);
  }

  if (property.type) {
    score += 1;
  }

  return score;
};

export const rankFeaturedProperties = (properties = [], filters = {}, excludedIds = []) => {
  const excluded = new Set(excludedIds.filter(Boolean).map((id) => String(id)));
  const pool = properties.filter((property) => !excluded.has(String(property?._id || property?.id)));

  if (!hasBrowseFilters(filters)) {
    return sortPropertiesByNewest(pool);
  }

  return [...pool]
    .map((property) => ({
      property,
      score: getFilterMatchScore(property, filters),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;

      const leftTime = new Date(left.property?.createdAt || left.property?.updatedAt || 0).getTime();
      const rightTime = new Date(right.property?.createdAt || right.property?.updatedAt || 0).getTime();
      return rightTime - leftTime;
    })
    .map(({ property }) => property);
};

export const isRecentlyAdded = (property, days = 30) => {
  if (!property?.createdAt) return false;

  const createdAt = new Date(property.createdAt).getTime();
  if (Number.isNaN(createdAt)) return false;

  const ageInDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
  return ageInDays <= days;
};