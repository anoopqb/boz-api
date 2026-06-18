# boz-api

A simple Express API for searching rental properties by state.

## Endpoints

### `GET /properties/search?location=<state>`

Returns properties matching the given state or city name.

**Query Parameters:**
- `location` (required) — State name (e.g. `Texas`, `Washington DC`) or city name (e.g. `Austin`, `Chicago`)

**Example:**

```bash
curl "http://localhost:3000/properties/search?location=Washington%20DC"
```

**Response:**
```json
[
  {
    "name": "Capital Heights",
    "address": "1400 Pennsylvania Ave NW, Washington, DC 20004",
    "minRent": 2200
  },
  {
    "name": "The Ellipse",
    "address": "500 12th St NW, Washington, DC 20004",
    "minRent": 1950
  },
  {
    "name": "District Suites",
    "address": "700 H St NW, Washington, DC 20001",
    "minRent": 2100
  }
]
```

**Errors:**
- `400` — Missing `location` parameter
- `404` — No properties found for the given location

### `GET /`

Healthcheck — returns `boz-api is running`.

## Getting Started

```bash
npm start
```

Server runs on `http://localhost:3000`.

## Data

Property data lives in `data/properties.json` with mock properties across California, Texas, New York, Florida, Illinois, Washington DC, and Nevada.
