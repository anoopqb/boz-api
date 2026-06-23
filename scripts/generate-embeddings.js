require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const propertyService = require('../services/propertyService');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getEmbedding(text) {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text:v1.5', prompt: text }),
  });
  const data = await res.json();
  return data.embedding;
}

async function generate() {
  // Wait for propertyService to finish loading
  await propertyService.ready;

  const { data: props } = await supabase.from('properties').select('*').order('id');
  console.log(`Generating embeddings for ${props.length} properties...`);

  for (const p of props) {
    const enriched = propertyService.findProperty(p.id);
    if (!enriched) continue;

    // Build a rich natural language description for semantic search
    const searchText = [
      `${enriched.name} — ${enriched.description}`,
      `Located in ${enriched.neighborhood}, ${enriched.city}, ${enriched.state}.`,
      `Rent range: $${enriched.minRent}–$${enriched.maxRent}.`,
      `Built ${enriched.yearBuilt} with ${enriched.unitsTotal} units.`,
      `Amenities include: ${enriched.amenities.join(', ')}.`,
      enriched.luxury ? 'Luxury living with premium finishes and concierge service.' : '',
      enriched.petFriendly ? 'Pet-friendly community with dog park and pet amenities.' : '',
      enriched.nearMetro ? `Steps from ${enriched.metroStation} station — excellent transit access.` : '',
      enriched.newDevelopment ? 'Newly developed with modern features.' : '',
    ].filter(Boolean).join(' ');

    const embedding = await getEmbedding(searchText);
    await supabase.from('properties').update({ search_text: searchText, embedding }).eq('id', p.id);

    console.log(`  ✓ ${p.name} — ${embedding.length} dims`);
  }

  console.log('Done — embeddings stored in Supabase');
}

generate().catch(console.error);