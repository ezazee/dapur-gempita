const { Client } = require('pg');
require('dotenv').config();

async function migrate() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        await client.query(`
            ALTER TABLE purchase_items 
            ALTER COLUMN photo_url TYPE TEXT;
        `);

        console.log('✓ Successfully changed photo_url to TEXT');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
