import { Sequelize } from 'sequelize';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in environment variables');
}

// Strip sslmode from URL to prevent pg warning, rely on dialectOptions instead
let dbUrl = process.env.DATABASE_URL;
let isSslRequired = true;

try {
    const url = new URL(process.env.DATABASE_URL);
    
    // Check if sslmode is explicitly false or disable
    const sslMode = url.searchParams.get('sslmode');
    if (sslMode === 'false' || sslMode === 'disable') {
        isSslRequired = false;
    } else if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        isSslRequired = false;
    }

    url.searchParams.delete('sslmode');
    dbUrl = url.toString();
} catch (e) {
    // Fallback if URL parsing fails (unlikely)
    console.error('Failed to parse DATABASE_URL', e);
}

const dialectOptions: any = {};
if (isSslRequired) {
    dialectOptions.ssl = {
        require: true,
        rejectUnauthorized: false,
    };
} else {
    dialectOptions.ssl = false;
}

export const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: false,
    dialectOptions,
});

// Test connection
const testConnection = async () => {
    try {
        await sequelize.authenticate();
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

if (process.env.NODE_ENV !== 'production') {
    testConnection();
}
