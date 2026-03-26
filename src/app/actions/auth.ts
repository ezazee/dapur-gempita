'use server';

import { User, Role } from '@/models';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';

const COOKIE_NAME = 'auth_session';

export async function login(email: string, password: string) {
    try {
        // Fetch user with Role association
        const user = await User.findOne({
            where: { email },
            include: [{ model: Role, as: 'role' }]
        });

        if (!user) {
            return { error: 'Email tidak ditemukan' };
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return { error: 'Password salah' };
        }

        if (!user.isActive) {
            return { error: 'Akun dinonaktifkan' };
        }

        // Set session cookie
// DEBUG LOG
        const sessionData = JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role?.name || 'UNKNOWN' // Get role name from association
        });

        const cookieStore = await cookies();
        cookieStore.set(COOKIE_NAME, sessionData, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        return { success: true, role: user.role?.name };
    } catch (error) {
        console.error('Login error:', error);
        return { error: 'Terjadi kesalahan saat login (DB Error)' };
    }
}

export async function logout() {
    (await cookies()).delete(COOKIE_NAME);
    redirect('/auth');
}

export async function getSession() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);
    if (!sessionCookie) return null;
    try {
        return JSON.parse(sessionCookie.value);
    } catch (e) {
        return null;
    }
}
