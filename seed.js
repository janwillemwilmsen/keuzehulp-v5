import 'dotenv/config';
import sql from './db.js';

async function seed() {
  try {
    console.log("Seeding suppliers...");
    
    // Insert suppliers
    const suppliers = await sql`
      INSERT INTO public.suppliers (name, slug)
      VALUES 
        ('Essent', 'essent'),
        ('Energiedirect', 'energiedirect')
      ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug
      RETURNING id, slug;
    `;

    console.log("Seeding contract types...");

    // Insert contract types
    const contractTypes = [
      { slug: 'variabel', name: 'Variabel', description: 'Variabel tarief' },
      { slug: 'vast1', name: 'Vast 1 jaar', description: '1 jaar zekerheid' },
      { slug: 'vast3', name: 'Vast 3 jaar', description: '3 jaar zekerheid' },
      { slug: 'dynamisch', name: 'Dynamisch', description: 'Prijzen per uur' },
      { slug: 'timeofuse', name: 'Time of Use', description: 'Dal/Normaal/Piek tarieven' } // Just as an example for extra
    ];

    await sql`
      INSERT INTO public.contract_types ${sql(contractTypes, 'slug', 'name', 'description')}
      ON CONFLICT (slug) DO UPDATE SET 
        name = EXCLUDED.name,
        description = EXCLUDED.description
    `;

    console.log("Seed successful.");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
