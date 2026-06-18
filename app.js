const express = require('express');
const properties = require('./data/properties.json');
const pexels = require('./services/pexels');

const app = express();
let pexelsLoaded = false;

// GET /properties/search?location=<state name>
app.get('/properties/search', async (req, res) => {
  const { location } = req.query;

  if (!location) {
    return res.status(400).json({ error: 'location query parameter is required' });
  }

  // Lazy-load Pexels on first request (handles both local dev and Vercel cold starts)
  if (!pexelsLoaded) {
    pexelsLoaded = true;
    await pexels.loadImages();
  }

  const locationLower = location.toLowerCase();

  const filtered = properties.filter((p) =>
    p.state.toLowerCase() === locationLower ||
    p.city.toLowerCase() === locationLower
  );

  if (filtered.length === 0) {
    return res.status(404).json({ message: `No properties found for "${location}"` });
  }

  const result = filtered.map((p) => {
    const img = pexels.getImageForProperty(p.id);
    return {
      name: p.name,
      address: p.address,
      minRent: p.minRent,
      imageUrl: img ? img.url : null,
      photographer: img ? img.photographer : null,
    };
  });

  res.json(result);
});

// Healthcheck
app.get('/', (_req, res) => res.send('boz-api is running'));

module.exports = app;
