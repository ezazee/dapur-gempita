'use server';

import { Role } from '@/models';
import { getSession } from './auth';

export async function getRoles() {
    try {
        const roles = await Role.findAll({
            order: [['id', 'ASC']]
        });
        return roles.map(r => ({ id: r.id, name: r.name }));
    } catch (error) {
        console.error('Error fetching roles:', error);
        return [];
    }
}
