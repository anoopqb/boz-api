const express = require('express');
const properties = require('./data/properties.json');

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

  const result = filtered.map((p) => ({
    name: p.name,
    address: p.address,
    minRent: p.minRent,
  }));

  res.json(result);
});

// Healthcheck
app.get('/', (_req, res) => res.send('boz-api is running'));

app.listen(PORT, () => {
  console.log(`boz-api listening on http://localhost:${PORT}`);
});
