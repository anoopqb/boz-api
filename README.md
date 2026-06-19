# boz-api

Express API backing a Property Search MCP server. Provides endpoints for the full apartment-hunting journey — discovery, details, floor plans, availability, gallery, neighborhood, pricing, comparison, tours, contact, and applications.

## Getting Started

```bash
npm start
```

Server runs on `http://localhost:3000`.

## MCP Tool → API Mapping

| MCP Tool | HTTP Endpoint |
|---|---|
| `find_properties` | `GET /properties/search` |
| `get_property_details` | `GET /properties/:id` |
| `get_floorplans` | `GET /properties/:id/floorplans` |
| `get_available_units` | `GET /properties/:id/units` |
| `get_property_gallery` | `GET /properties/:id/gallery` |
| `get_neighborhood_info` | `GET /properties/:id/neighborhood` |
| `get_pricing` | `GET /properties/:id/pricing` |
| `compare_properties` | `GET /properties/compare` |
| `schedule_tour` | `POST /properties/:id/tours` |
| `contact_property` | `POST /properties/:id/contact` |
| `get_application_info` | `GET /properties/:id/application` |

---

## Endpoints

### `GET /properties/search` — find_properties

Search rental properties with filters.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `location` | string | State, city, or neighborhood (e.g. `Washington DC`, `Georgetown`, `Arlington`) |
| `name` | string | Property name search (e.g. `Harper`) |
| `neighborhood` | string | Neighborhood filter (e.g. `Georgetown`) |
| `maxRent` | number | Maximum starting rent |
| `minRent` | number | Minimum rent range |
| `bedrooms` | number | Minimum bedroom count (0 = studio) |
| `petFriendly` | boolean | Pet-friendly only |
| `luxury` | boolean | Luxury communities only |
| `newDevelopment` | boolean | New communities only |
| `nearMetro` | boolean | Near public transit |
| `amenities` | string | Comma-separated amenities (e.g. `gym,pool`) |

**Example:**

```bash
curl "http://localhost:3000/properties/search?location=Washington%20DC&maxRent=3000&bedrooms=2&petFriendly=true"
```

---

### `GET /properties/:id` — get_property_details

Full property details including amenities, pet policy, parking, and EV charging.

```bash
curl "http://localhost:3000/properties/15"
```

---

### `GET /properties/:id/floorplans` — get_floorplans

Floor plans with beds, baths, sqft, and rent.

```bash
curl "http://localhost:3000/properties/15/floorplans"
```

---

### `GET /properties/:id/units` — get_available_units

Available units with move-in dates and specials.

**Query Parameters:** `maxRent`, `bedrooms`, `availableMonth` (YYYY-MM)

```bash
curl "http://localhost:3000/properties/15/units?maxRent=3000&availableMonth=2026-07"
```

---

### `GET /properties/:id/gallery` — get_property_gallery

Photos by category and virtual tour URL.

**Query Parameters:** `category` (exterior, kitchen, rooftop, etc.)

```bash
curl "http://localhost:3000/properties/15/gallery?category=kitchen"
```

---

### `GET /properties/:id/neighborhood` — get_neighborhood_info

Walk/transit scores, schools, restaurants, and nearby amenities.

```bash
curl "http://localhost:3000/properties/15/neighborhood"
```

---

### `GET /properties/:id/pricing` — get_pricing

Starting rent, parking fees, utilities, deposits, and lease terms.

```bash
curl "http://localhost:3000/properties/15/pricing"
```

---

### `GET /properties/compare` — compare_properties

Side-by-side comparison of two or more properties.

```bash
curl "http://localhost:3000/properties/compare?propertyIds=15,17"
```

---

### `POST /properties/:id/tours` — schedule_tour

Schedule an in-person or virtual tour.

**Body:**

```json
{
  "date": "2026-06-20",
  "time": "10:00 AM",
  "tourType": "in-person",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "555-0100"
}
```

```bash
curl -X POST "http://localhost:3000/properties/15/tours" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-06-20","time":"10:00 AM","name":"Jane Doe","email":"jane@example.com"}'
```

---

### `POST /properties/:id/contact` — contact_property

Send an inquiry to the leasing office.

**Body:**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "555-0100",
  "message": "Interested in 2-bedroom units",
  "contactMethod": "email"
}
```

```bash
curl -X POST "http://localhost:3000/properties/15/contact" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","message":"Interested in 2-bedroom units"}'
```

---

### `GET /properties/:id/application` — get_application_info

Application process, fees, required documents, and income requirements.

```bash
curl "http://localhost:3000/properties/15/application"
```

---

### `GET /`

Healthcheck — returns `boz-api is running`.

## Data

Property data lives in `data/properties.json` with 74 mock properties across California, Texas, New York, Florida, Illinois, Washington DC, Nevada, and Virginia (Arlington).

Featured DC properties for demo journeys:

- **The Harper** (id: 15) — luxury downtown, pet-friendly
- **Union Place** (id: 17) — NoMa, gym & pool
- **Georgetown Manor** (id: 59) — luxury Georgetown

Floor plans, units, neighborhood scores, and pricing are generated deterministically from each property's attributes.

## Environment

Optional Pexels API key for property images:

```bash
PEXELS_API_KEY=your_key_here
```

See `.env.example`.
