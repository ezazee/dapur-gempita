'use server';

import { Note, User } from '@/models';
import { getSession } from './auth';
import { revalidatePath } from 'next/cache';

export async function getNotes() {
    const session = await getSession();
    if (!session) return [];

    try {
        const notes = await Note.findAll({
            include: [{ model: User, as: 'creator', attributes: ['name'] }],
            order: [['createdAt', 'DESC']]
        });
        return notes.map(n => n.toJSON());
    } catch (error) {
        console.error('Error fetching notes:', error);
        return [];
    }
}

export async function createNote(data: { title: string; content: string }) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    try {
        await Note.create({
            title: data.title,
            content: data.content,
            createdBy: session.id
        });
        revalidatePath('/notes');
        return { success: true };
    } catch (error) {
        console.error('Error creating note:', error);
        return { error: 'Failed to create note' };
    }
}

export async function deleteNote(id: string) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    if (!['SUPER_ADMIN', 'AHLI_GIZI'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        await Note.destroy({ where: { id } });
        revalidatePath('/notes');
        return { success: true };
    } catch (error) {
        console.error('Error deleting note:', error);
        return { error: 'Failed to delete note' };
    }
}
