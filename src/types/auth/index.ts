export type UserRole = 'SUPER_ADMIN' | 'AHLI_GIZI' | 'KEUANGAN' | 'ASLAP' | 'CHEF' | 'KEPALA_DAPUR';

export interface User {
    id: string;
    email: string;
    name: string;
    roleId: number;
    isActive: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
    role?: Role;
}

export interface Role {
    id: number;
    name: UserRole;
}

export interface AuthSession {
    user: User;
    token?: string;
}
