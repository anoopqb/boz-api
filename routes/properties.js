const express = require('express');
const propertyService = require('../services/propertyService');
const pexels = require('../services/pexels');

const router = express.Router();

async function ensurePexelsLoaded() {
  if (!router.pexelsLoaded) {
    router.pexelsLoaded = true;
    await pexels.loadImages();
  }
}

function getPropertyOr404(id, res) {
  const property = propertyService.findProperty(id);
  if (!property) {
    res.status(404).json({ error: 'Property not found' });
    return null;
  }
  return property;
}

// find_properties
router.get('/search', async (req, res) => {
  const { location, maxRent, minRent, bedrooms, petFriendly, luxury, newDevelopment, nearMetro, neighborhood, amenities, name } = req.query;

  if (!location && !name && !neighborhood) {
    return res.status(400).json({
      error: 'At least one of location, name, or neighborhood is required',
    });
  }

  await ensurePexelsLoaded();

  const results = propertyService.findProperties({
    location,
    maxRent,
    minRent,
    bedrooms,
    petFriendly,
    luxury,
    newDevelopment,
    nearMetro,
    neighborhood,
    amenities,
    name,
  });

  if (results.length === 0) {
    return res.status(404).json({ message: 'No properties found matching your criteria' });
  }

  const properties = results.map((p) => {
    const img = pexels.getImageForProperty(p.id);
    return {
      ...propertyService.toSearchResult(p),
      imageUrl: img ? img.url : null,
      photographer: img ? img.photographer : null,
    };
  });

  res.json({ count: properties.length, properties });
});

// compare_properties — must be registered before /:id
router.get('/compare', (req, res) => {
  const ids = req.query.propertyIds ?? req.query.ids;
  if (!ids) {
    return res.status(400).json({ error: 'propertyIds query parameter is required (comma-separated)' });
  }

  const propertyIds = String(ids).split(',').map((id) => id.trim());
  const result = propertyService.compareProperties(propertyIds);

  if (result.error) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// get_property_details — also supports lookup by name via query
router.get('/:id', async (req, res) => {
  let property = propertyService.findProperty(req.params.id);

  if (!property && req.query.name) {
    const matches = propertyService.findProperties({ name: req.query.name });
    property = matches[0];
  }

  if (!property) {
    return res.status(404).json({ error: 'Property not found' });
  }

  await ensurePexelsLoaded();
  const img = pexels.getImageForProperty(property.id);

  res.json({
    ...propertyService.getPropertyDetails(property),
    imageUrl: img ? img.url : null,
  });
});

// get_floorplans
router.get('/:id/floorplans', (req, res) => {
  const property = getPropertyOr404(req.params.id, res);
  if (!property) return;

  res.json({
    propertyId: property.id,
    propertyName: property.name,
    floorplans: propertyService.getFloorplans(property),
  });
});

// get_available_units
router.get('/:id/units', (req, res) => {
  const property = getPropertyOr404(req.params.id, res);
  if (!property) return;

  const { maxRent, bedrooms, availableMonth } = req.query;
  const units = propertyService.getAvailableUnits(property, { maxRent, bedrooms, availableMonth });

  res.json({
    propertyId: property.id,
    propertyName: property.name,
    count: units.length,
    units,
  });
});

// get_property_gallery
router.get('/:id/gallery', async (req, res) => {
  const property = getPropertyOr404(req.params.id, res);
  if (!property) return;

  await ensurePexelsLoaded();

  const categories = ['exterior', 'lobby', 'kitchen', 'bedroom', 'bathroom', 'pool', 'gym', 'rooftop'];
  const { category } = req.query;

  const images = categories.map((cat, i) => {
    const img = pexels.getImageForProperty(property.id + i * 3);
    return {
      category: cat,
      url: img ? img.url : null,
      caption: `${property.name} — ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
      photographer: img ? img.photographer : null,
    };
  });

  const filtered = category
    ? images.filter((img) => img.category === category.toLowerCase())
    : images;

  res.json({
    propertyId: property.id,
    propertyName: property.name,
    images: filtered,
    virtualTourUrl: property.luxury
      ? `https://tours.example.com/${property.id}/virtual`
      : null,
  });
});

// get_neighborhood_info
router.get('/:id/neighborhood', (req, res) => {
  const property = getPropertyOr404(req.params.id, res);
  if (!property) return;

  res.json({
    propertyId: property.id,
    propertyName: property.name,
    ...propertyService.getNeighborhoodInfo(property),
  });
});

// get_pricing
router.get('/:id/pricing', (req, res) => {
  const property = getPropertyOr404(req.params.id, res);
  if (!property) return;

  res.json({
    propertyId: property.id,
    propertyName: property.name,
    ...propertyService.getPricing(property),
  });
});

// get_application_info
router.get('/:id/application', (req, res) => {
  const property = getPropertyOr404(req.params.id, res);
  if (!property) return;

  res.json({
    propertyId: property.id,
    propertyName: property.name,
    ...propertyService.getApplicationInfo(property),
  });
});

// schedule_tour
router.post('/:id/tours', (req, res) => {
  const property = getPropertyOr404(req.params.id, res);
  if (!property) return;

  const { date, time, tourType, name, email, phone } = req.body ?? {};

  if (!date) {
    return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
  }

  res.status(201).json(propertyService.scheduleTour(property.id, { date, time, tourType, name, email, phone }));
});

// contact_property
router.post('/:id/contact', (req, res) => {
  const property = getPropertyOr404(req.params.id, res);
  if (!property) return;

  const { name, email, phone, message, contactMethod } = req.body ?? {};

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  res.status(201).json(propertyService.contactProperty(property.id, { name, email, phone, message, contactMethod }));
});

module.exports = router;
