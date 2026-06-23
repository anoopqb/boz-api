const supabase = require('./supabase');
const pexels = require('./pexels');

let _initialized = false;

async function loadPropertiesFromDb() {
  if (_initialized) return properties;

  // Load Pexels images into Supabase first
  await pexels.loadImages();

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('id');

  if (error) {
    console.error('Failed to load properties from Supabase:', error.message);
    return [];
  }

  const raw = (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    city: p.city,
    state: p.state,
    minRent: p.min_rent,
    luxury: p.luxury ?? undefined,
    petFriendly: p.pet_friendly ?? undefined,
    nearMetro: p.near_metro ?? undefined,
    newDevelopment: p.new_development ?? undefined,
    amenities: p.amenities ?? undefined,
    imageUrl: p.image_url ?? undefined,
    photographer: p.photographer ?? undefined,
    searchText: p.search_text ?? undefined,
  }));

  _initialized = true;
  return raw;
}

// Start loading eagerly on module load
const ready = loadPropertiesFromDb().then((raw) => {
  properties.length = 0;
  properties.push(...raw.map(enrichProperty));
  console.log(`Loaded ${properties.length} properties from Supabase`);
});

const AMENITY_POOL = [
  'gym',
  'pool',
  'parking',
  'rooftop',
  'ev-charging',
  'concierge',
  'dog-park',
  'business-center',
  'package-lockers',
  'clubhouse',
  'bike-storage',
];

const NEIGHBORHOOD_BY_NAME = {
  'The Harper': 'Downtown',
  'Union Place': 'NoMa',
  'Georgetown Manor': 'Georgetown',
  'DuPont Circle Suites': 'DuPont Circle',
  'Adams Morgan Flats': 'Adams Morgan',
  'Capitol Riverfront': 'Navy Yard',
  'NoMa Residences': 'NoMa',
};

const DC_METRO = {
  Downtown: 'Metro Center',
  Georgetown: 'Foggy Bottom-GWU',
  'DuPont Circle': 'DuPont Circle',
  'Adams Morgan': 'Woodley Park-Zoo',
  NoMa: 'NoMa-Gallaudet U',
  'Navy Yard': 'Navy Yard-Ballpark',
  'Capitol Hill': 'Capitol South',
};

function pickFrom(seed, items, count) {
  const result = [];
  for (let i = 0; i < items.length && result.length < count; i++) {
    if ((seed + i * 7) % 3 !== 0 || result.length === 0) {
      result.push(items[(seed + i) % items.length]);
    }
  }
  return [...new Set(result)];
}

function deriveNeighborhood(property) {
  if (NEIGHBORHOOD_BY_NAME[property.name]) {
    return NEIGHBORHOOD_BY_NAME[property.name];
  }
  if (property.city === 'Arlington') return 'Clarendon';
  if (property.state === 'Washington DC') {
    const hoods = ['Downtown', 'Georgetown', 'Capitol Hill', 'NoMa', 'Adams Morgan'];
    return hoods[property.id % hoods.length];
  }
  return `${property.city} Central`;
}

function enrichProperty(property) {
  const seed = property.id;
  const neighborhood = deriveNeighborhood(property);
  const luxury = property.luxury ?? (property.minRent >= 2500 || seed % 7 === 0);
  const petFriendly = property.petFriendly ?? seed % 4 !== 0;
  const newDevelopment = property.newDevelopment ?? seed % 11 === 0;
  const nearMetro =
    property.nearMetro ??
    (property.state === 'Washington DC' ||
      property.city === 'Arlington' ||
      property.city === 'New York' ||
      seed % 3 === 0);

  const amenityCount = luxury ? 6 : 3 + (seed % 4);
  const amenities = property.amenities ?? pickFrom(seed, AMENITY_POOL, amenityCount);

  const metroStation =
    property.metroStation ??
    (property.state === 'Washington DC' ? DC_METRO[neighborhood] : null) ??
    (property.city === 'Arlington' ? 'Clarendon' : null) ??
    (nearMetro ? `${property.city} Transit Center` : null);

  return {
    ...property,
    neighborhood,
    luxury,
    petFriendly,
    newDevelopment,
    nearMetro,
    amenities,
    metroStation,
    maxRent: property.maxRent ?? property.minRent + 600 + (seed % 6) * 250,
    yearBuilt: property.yearBuilt ?? 1995 + (seed % 25),
    unitsTotal: property.unitsTotal ?? 80 + (seed % 20) * 15,
    description:
      property.description ??
      `${property.name} is a ${luxury ? 'luxury' : 'modern'} apartment community in ${neighborhood}, ${property.city}. Built in ${1995 + (seed % 25)}, it offers ${amenities.slice(0, 3).join(', ')}${amenities.length > 3 ? ', and more' : ''}.`,
    contact: property.contact ?? {
      phone: `(${200 + (seed % 800)}) ${100 + (seed % 900)}-${1000 + (seed % 9000)}`,
      email: `leasing@${property.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      officeHours: 'Mon–Fri 9am–6pm, Sat 10am–5pm, Sun 12pm–5pm',
    },
  };
}

const properties = [];

function findProperty(id) {
  const numericId = Number(id);
  return properties.find((p) => p.id === numericId || String(p.id) === String(id));
}

function normalizeLocation(value) {
  return value.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

function matchesLocation(property, location) {
  const loc = normalizeLocation(location);
  const aliases = {
    dc: 'washington dc',
    'washington dc': 'washington dc',
    'washington d c': 'washington dc',
    'district of columbia': 'washington dc',
  };
  const normalized = aliases[loc] ?? loc;

  return (
    normalizeLocation(property.state) === normalized ||
    normalizeLocation(property.city) === normalized ||
    normalizeLocation(property.neighborhood) === normalized ||
    normalizeLocation(`${property.city} ${property.state}`) === normalized
  );
}

function propertyHasBedrooms(property, bedrooms) {
  const plans = getFloorplans(property);
  return plans.some((fp) => fp.beds === Number(bedrooms));
}

function findProperties(filters = {}) {
  let results = [...properties];

  if (filters.location) {
    results = results.filter((p) => matchesLocation(p, filters.location));
  }
  if (filters.maxRent != null) {
    results = results.filter((p) => p.minRent <= Number(filters.maxRent));
  }
  if (filters.minRent != null) {
    results = results.filter((p) => p.maxRent >= Number(filters.minRent));
  }
  if (filters.bedrooms != null) {
    results = results.filter((p) => propertyHasBedrooms(p, filters.bedrooms));
  }
  if (filters.petFriendly === true || filters.petFriendly === 'true') {
    results = results.filter((p) => p.petFriendly);
  }
  if (filters.luxury === true || filters.luxury === 'true') {
    results = results.filter((p) => p.luxury);
  }
  if (filters.newDevelopment === true || filters.newDevelopment === 'true') {
    results = results.filter((p) => p.newDevelopment);
  }
  if (filters.nearMetro === true || filters.nearMetro === 'true') {
    results = results.filter((p) => p.nearMetro);
  }
  if (filters.neighborhood) {
    const hood = normalizeLocation(filters.neighborhood);
    results = results.filter((p) => normalizeLocation(p.neighborhood) === hood);
  }
  if (filters.amenities) {
    const required = (Array.isArray(filters.amenities)
      ? filters.amenities
      : String(filters.amenities).split(',')
    ).map((a) => a.toLowerCase().trim());
    results = results.filter((p) =>
      required.every((a) => p.amenities.some((pa) => pa.toLowerCase() === a))
    );
  }
  if (filters.name) {
    const name = filters.name.toLowerCase();
    results = results.filter((p) => p.name.toLowerCase().includes(name));
  }

  return results;
}

function getFloorplans(property) {
  if (property.floorplans) return property.floorplans;

  const seed = property.id;
  const templates = [
    { name: 'Studio S1', beds: 0, baths: 1, sqft: 520, rentOffset: 0 },
    { name: 'A1', beds: 1, baths: 1, sqft: 680, rentOffset: 200 },
    { name: 'A2', beds: 1, baths: 1, sqft: 750, rentOffset: 350 },
    { name: 'B1', beds: 2, baths: 2, sqft: 980, rentOffset: 550 },
    { name: 'B2', beds: 2, baths: 2, sqft: 1100, rentOffset: 700 },
    { name: 'C1', beds: 3, baths: 2, sqft: 1350, rentOffset: 950 },
  ];

  const count = property.luxury ? 5 : 3 + (seed % 3);
  return templates.slice(0, count).map((t, i) => ({
    id: `${property.id}-fp-${i + 1}`,
    name: t.name,
    beds: t.beds,
    baths: t.baths,
    sqft: t.sqft + (seed % 50),
    rent: property.minRent + t.rentOffset + (seed % 100),
  }));
}

function getAvailableUnits(property, filters = {}) {
  const floorplans = getFloorplans(property);
  const seed = property.id;
  const units = [];

  floorplans.forEach((fp, fpIndex) => {
    const unitCount = 1 + ((seed + fpIndex) % 3);
    for (let u = 0; u < unitCount; u++) {
      const unitNum = `${fpIndex + 2}${String(u + 1).padStart(2, '0')}`;
      const availableDate = new Date();
      availableDate.setDate(availableDate.getDate() + ((seed + u + fpIndex) % 90));

      const hasSpecial = (seed + fpIndex + u) % 4 === 0;
      const rent = fp.rent + (u * 50);

      units.push({
        unitNumber: unitNum,
        floorplanId: fp.id,
        floorplanName: fp.name,
        beds: fp.beds,
        baths: fp.baths,
        sqft: fp.sqft,
        rent,
        availableDate: availableDate.toISOString().split('T')[0],
        moveInSpecial: hasSpecial
          ? `${1 + (seed % 2)} month${seed % 2 ? '' : 's'} free on 13-month lease`
          : null,
      });
    }
  });

  let filtered = units;
  if (filters.maxRent != null) {
    filtered = filtered.filter((u) => u.rent <= Number(filters.maxRent));
  }
  if (filters.bedrooms != null) {
    filtered = filtered.filter((u) => u.beds === Number(filters.bedrooms));
  }
  if (filters.availableMonth) {
    const [year, month] = String(filters.availableMonth).split('-').map(Number);
    filtered = filtered.filter((u) => {
      const d = new Date(u.availableDate);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }

  return filtered;
}

function getNeighborhoodInfo(property) {
  const seed = property.id;
  const baseWalk = property.state === 'Washington DC' ? 85 : 60;
  const baseTransit = property.nearMetro ? 80 : 45;

  return {
    neighborhood: property.neighborhood,
    city: property.city,
    state: property.state,
    walkScore: Math.min(99, baseWalk + (seed % 15)),
    transitScore: Math.min(99, baseTransit + (seed % 12)),
    bikeScore: Math.min(99, 50 + (seed % 40)),
    metroStation: property.metroStation,
    description: `${property.neighborhood} is a vibrant area in ${property.city} with dining, shopping, and ${property.nearMetro ? 'excellent public transit' : 'local amenities'}.`,
    schools: [
      { name: `${property.city} Elementary School`, type: 'Public', distance: `${0.3 + (seed % 5) * 0.2} mi`, rating: 7 + (seed % 3) },
      { name: `${property.neighborhood} Academy`, type: 'Private', distance: `${0.5 + (seed % 4) * 0.3} mi`, rating: 8 + (seed % 2) },
    ],
    restaurants: [
      { name: 'The Local Table', cuisine: 'American', distance: `${0.1 + (seed % 3) * 0.1} mi`, rating: 4.2 + (seed % 8) / 10 },
      { name: 'Metro Bistro', cuisine: 'Mediterranean', distance: `${0.2 + (seed % 4) * 0.1} mi`, rating: 4.0 + (seed % 9) / 10 },
      { name: 'Corner Cafe', cuisine: 'Coffee & Brunch', distance: `${0.1 + (seed % 2) * 0.15} mi`, rating: 4.3 + (seed % 6) / 10 },
    ],
    grocery: [
      { name: 'Whole Foods Market', distance: `${0.4 + (seed % 3) * 0.2} mi` },
      { name: 'Trader Joe\'s', distance: `${0.6 + (seed % 4) * 0.2} mi` },
    ],
    parks: [
      { name: `${property.neighborhood} Park`, distance: `${0.2 + (seed % 5) * 0.15} mi` },
    ],
  };
}

function getPricing(property) {
  const floorplans = getFloorplans(property);
  const rents = floorplans.map((fp) => fp.rent);
  const seed = property.id;

  return {
    startingRent: property.minRent,
    rentRange: { min: Math.min(...rents), max: Math.max(...rents) },
    parking: {
      available: property.amenities.includes('parking'),
      covered: `$${75 + (seed % 4) * 25}/month`,
      garage: `$${125 + (seed % 5) * 25}/month`,
      streetParking: seed % 3 === 0 ? 'Limited street parking nearby' : null,
    },
    utilities: {
      includedInRent: ['Water', 'Sewer', 'Trash'],
      tenantPays: ['Electricity', 'Internet'],
      averageUtilityCost: `$${80 + (seed % 6) * 15}/month`,
    },
    fees: {
      applicationFee: `$${45 + (seed % 3) * 10}`,
      adminFee: `$${150 + (seed % 4) * 25}`,
      petFee: property.petFriendly ? `$${300 + (seed % 3) * 50} (one-time)` : null,
      petRent: property.petFriendly ? `$${25 + (seed % 3) * 10}/month per pet` : null,
    },
    deposit: `$${property.minRent} (one month rent)`,
    leaseTerms: ['6 months', '12 months', '14 months', '18 months'],
  };
}

function getApplicationInfo(property) {
  const seed = property.id;
  return {
    process: [
      'Submit online application with required documents',
      'Pay application fee',
      'Background and credit check (typically 24–48 hours)',
      'Sign lease and pay deposit',
      'Schedule move-in',
    ],
    applicationFee: `$${45 + (seed % 3) * 10}`,
    requiredDocuments: [
      'Government-issued photo ID',
      'Proof of income (2 recent pay stubs or offer letter)',
      'Bank statements (last 2 months)',
      'Rental history or landlord reference',
    ],
    incomeRequirement: 'Gross monthly income must be 3x the monthly rent',
    creditRequirement: 'Minimum credit score of 620 (650+ preferred)',
    approvalTimeline: '1–3 business days',
    onlineApplicationUrl: `https://apply.example.com/${property.id}`,
  };
}

function getPropertyDetails(property) {
  const floorplans = getFloorplans(property);
  return {
    id: property.id,
    name: property.name,
    address: property.address,
    city: property.city,
    state: property.state,
    neighborhood: property.neighborhood,
    description: property.description,
    minRent: property.minRent,
    maxRent: property.maxRent,
    yearBuilt: property.yearBuilt,
    unitsTotal: property.unitsTotal,
    petFriendly: property.petFriendly,
    luxury: property.luxury,
    newDevelopment: property.newDevelopment,
    nearMetro: property.nearMetro,
    metroStation: property.metroStation,
    amenities: property.amenities,
    parking: property.amenities.includes('parking'),
    evCharging: property.amenities.includes('ev-charging'),
    rentIncludes: ['Water', 'Sewer', 'Trash', ...(property.luxury ? ['Cable TV'] : [])],
    floorplanSummary: {
      count: floorplans.length,
      bedsAvailable: [...new Set(floorplans.map((fp) => fp.beds))].sort(),
    },
    contact: property.contact,
    imageUrl: property.imageUrl ?? null,
    photographer: property.photographer ?? null,
    searchText: property.searchText ?? null,
  };
}

function compareProperties(propertyIds) {
  const ids = propertyIds.map(Number);
  const selected = ids.map(findProperty).filter(Boolean);

  if (selected.length < 2) {
    return { error: 'At least two valid property IDs are required' };
  }

  return {
    properties: selected.map((p) => {
      const floorplans = getFloorplans(p);
      const pricing = getPricing(p);
      return {
        id: p.id,
        name: p.name,
        address: p.address,
        neighborhood: p.neighborhood,
        startingRent: p.minRent,
        rentRange: pricing.rentRange,
        petFriendly: p.petFriendly,
        luxury: p.luxury,
        amenities: p.amenities,
        largestFloorplan: floorplans.reduce((max, fp) => (fp.sqft > max.sqft ? fp : max), floorplans[0]),
        walkScore: getNeighborhoodInfo(p).walkScore,
        transitScore: getNeighborhoodInfo(p).transitScore,
      };
    }),
    comparison: {
      cheapest: selected.reduce((min, p) => (p.minRent < min.minRent ? p : min)).name,
      mostExpensive: selected.reduce((max, p) => (p.minRent > max.minRent ? p : max)).name,
      largestUnits: selected.reduce((max, p) => {
        const maxSqft = Math.max(...getFloorplans(p).map((fp) => fp.sqft));
        const currentMax = Math.max(...getFloorplans(max).map((fp) => fp.sqft));
        return maxSqft > currentMax ? p : max;
      }).name,
    },
  };
}

function scheduleTour(propertyId, { date, time, tourType, name, email, phone }) {
  const property = findProperty(propertyId);
  if (!property) return { error: 'Property not found' };

  const confirmationId = `TOUR-${property.id}-${Date.now().toString(36).toUpperCase()}`;

  return {
    success: true,
    confirmationId,
    property: { id: property.id, name: property.name, address: property.address },
    tour: {
      date,
      time: time ?? '10:00 AM',
      type: tourType ?? 'in-person',
    },
    contact: property.contact,
    message: `Your ${tourType ?? 'in-person'} tour at ${property.name} is scheduled for ${date}${time ? ` at ${time}` : ''}. Confirmation: ${confirmationId}.`,
    attendee: name ? { name, email, phone } : undefined,
  };
}

function contactProperty(propertyId, { name, email, phone, message, contactMethod }) {
  const property = findProperty(propertyId);
  if (!property) return { error: 'Property not found' };

  const inquiryId = `INQ-${property.id}-${Date.now().toString(36).toUpperCase()}`;

  return {
    success: true,
    inquiryId,
    property: { id: property.id, name: property.name },
    leasingOffice: property.contact,
    submitted: {
      name,
      email,
      phone,
      message: message ?? 'General inquiry about availability',
      contactMethod: contactMethod ?? 'email',
    },
    message: `Your inquiry has been sent to the leasing office at ${property.name}. Expected response within 1 business day.`,
  };
}

function toSearchResult(property) {
  return {
    id: property.id,
    name: property.name,
    address: property.address,
    city: property.city,
    state: property.state,
    neighborhood: property.neighborhood,
    minRent: property.minRent,
    maxRent: property.maxRent,
    petFriendly: property.petFriendly,
    luxury: property.luxury,
    newDevelopment: property.newDevelopment,
    nearMetro: property.nearMetro,
    metroStation: property.metroStation,
    amenities: property.amenities,
    imageUrl: property.imageUrl ?? null,
    photographer: property.photographer ?? null,
  };
}

async function semanticSearch(query) {
  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text:v1.5', prompt: query }),
  });
  const { embedding } = await res.json();

  const { data, error } = await supabase.rpc('match_properties', {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 10,
  });

  if (error) return { error: error.message };

  return (data || []).map((m) => {
    const p = findProperty(m.id);
    return p ? { ...toSearchResult(p), similarity: m.similarity, searchText: m.search_text } : null;
  }).filter(Boolean);
}

module.exports = {
  properties,
  ready,
  findProperty,
  findProperties,
  semanticSearch,
  getPropertyDetails,
  getFloorplans,
  getAvailableUnits,
  getNeighborhoodInfo,
  getPricing,
  getApplicationInfo,
  compareProperties,
  scheduleTour,
  contactProperty,
  toSearchResult,
};
