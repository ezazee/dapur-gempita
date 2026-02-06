import { Sequelize } from 'sequelize';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in environment variables');
}

// Strip sslmode from URL to prevent pg warning, rely on dialectOptions instead
let dbUrl = process.env.DATABASE_URL;
try {
    const url = new URL(process.env.DATABASE_URL);
    url.searchParams.delete('sslmode');
    dbUrl = url.toString();
} catch (e) {
    // Fallback if URL parsing fails (unlikely)
    console.error('Failed to parse DATABASE_URL', e);
}

export const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false, // This allows self-signed certs (Neon/Dev)
        },
    },
});

// Test connection
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

if (process.env.NODE_ENV !== 'production') {
    testConnection();
}
