require('dotenv/config');
const express = require('express');
const properties = require('./data/properties.json');
const pexels = require('./services/pexels');

const app = express();
const PORT = process.env.PORT || 3000;

// GET /properties/search?location=<state name>
app.get('/properties/search', (req, res) => {
  const { location } = req.query;

  if (!location) {
    return res.status(400).json({ error: 'location query parameter is required' });
  }

  const locationLower = location.toLowerCase();

  const filtered = properties.filter((p) =>
    p.state.toLowerCase() === locationLower ||
    p.city.toLowerCase() === locationLower
  );

  if (filtered.length === 0) {
    return res.status(404).json({ message: `No properties found for "${location}"` });
  }

  const result = filtered.map((p, i) => {
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

app.listen(PORT, async () => {
  console.log('Loading Pexels images...');
  const ok = await pexels.loadImages();
  console.log(`boz-api listening on http://localhost:${PORT}`);
});
