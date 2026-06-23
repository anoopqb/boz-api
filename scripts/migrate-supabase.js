require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const rawProperties = require('../data/properties.json');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log(`Migrating ${rawProperties.length} properties to Supabase...`);

  const records = rawProperties.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    city: p.city,
    state: p.state,
    min_rent: p.minRent,
    luxury: p.luxury ?? null,
    pet_friendly: p.petFriendly ?? null,
    near_metro: p.nearMetro ?? null,
    new_development: p.newDevelopment ?? null,
    amenities: p.amenities ?? null,
  }));

  const { data, error } = await supabase.from('properties').upsert(records, { onConflict: 'id' });

  if (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }

  console.log(`Successfully migrated ${records.length} properties to Supabase.`);
  process.exit(0);
}

migrate();
