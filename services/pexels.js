const supabase = require('./supabase');

const PEXELS_API = 'https://api.pexels.com/v1';

const SEARCH_TERMS = [
  'house exterior',
  'apartment building',
  'real estate property',
  'modern home',
  'apartment complex',
  'luxury home',
  'suburban house',
  'residential building',
];

function buildImageUrl(photo, width = 640, height = 960) {
  const base = `https://images.pexels.com/photos/${photo.id}/pexels-photo-${photo.id}.jpeg`;
  return `${base}?auto=compress&cs=tinysrgb&w=${width}&h=${height}&fit=crop`;
}

async function fetchPage(searchTerm, page = 1, perPage = 80) {
  const url = `${PEXELS_API}/search?query=${encodeURIComponent(searchTerm)}&page=${page}&per_page=${perPage}&orientation=portrait&size=medium`;
  const res = await fetch(url, {
    headers: { Authorization: process.env.PEXELS_API_KEY },
  });
  if (!res.ok) {
    throw new Error(`Pexels API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function loadImages() {
  if (!process.env.PEXELS_API_KEY) {
    console.warn('PEXELS_API_KEY not set — property images will not be available');
    return false;
  }

  const seen = new Set();
  const allPhotos = [];

  for (const term of SEARCH_TERMS) {
    try {
      const data = await fetchPage(term);
      for (const photo of data.photos) {
        if (!seen.has(photo.id)) {
          seen.add(photo.id);
          allPhotos.push({
            id: photo.id,
            photographer: photo.photographer,
            photographerUrl: photo.photographer_url,
            url: buildImageUrl(photo),
          });
        }
      }
      console.log(`  ✓ "${term}" — ${data.photos.length} photos`);
    } catch (err) {
      console.warn(`  ✗ "${term}" — ${err.message}`);
    }
  }

  if (allPhotos.length === 0) {
    console.warn('  No photos fetched from Pexels');
    return false;
  }

  // Fetch properties from Supabase to assign images
  const { data: props, error } = await supabase.from('properties').select('id');
  if (error) {
    console.error('  Failed to load properties for image assignment:', error.message);
    return false;
  }

  // Assign one image per property and store in Supabase
  const updates = (props || []).map((p, i) => {
    const img = allPhotos[i % allPhotos.length];
    return supabase
      .from('properties')
      .update({ image_url: img.url, photographer: img.photographer })
      .eq('id', p.id);
  });

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    console.error(`  ${errors.length} image updates failed:`, errors[0].error.message);
    return false;
  }

  console.log(`  Stored ${results.length} image URLs in Supabase`);
  return true;
}

module.exports = { loadImages };
