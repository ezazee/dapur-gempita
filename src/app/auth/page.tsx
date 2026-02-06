'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { login } from "@/app/actions/auth";

// Demo accounts untuk testing
const DEMO_ACCOUNTS = [
    { role: "SUPER_ADMIN", email: "admin@dapur.id", password: "admin123", name: "Admin Utama" },
    { role: "AHLI_GIZI", email: "gizi@dapur.id", password: "gizi1234", name: "Ahli Gizi" },
    { role: "PEMBELI", email: "pembeli@dapur.id", password: "pembeli1", name: "Pembeli" },
    { role: "PENERIMA", email: "penerima@dapur.id", password: "penerima", name: "Penerima Barang" },
    { role: "CHEF", email: "chef@dapur.id", password: "chef1234", name: "Chef Dapur" },
    { role: "KEPALA_DAPUR", email: "kepala@dapur.id", password: "kepala12", name: "Kepala Dapur" },
];

export default function AuthPage() {
    const router = useRouter();

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loginData, setLoginData] = useState({ email: "", password: "" });
    const [seedStatus, setSeedStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const result = await login(loginData.email, loginData.password);

            if (result.error) {
                setError(result.error);
            } else if (result.success) {
                // Redirect based on role
                const role = result.role;
                let redirectPath = '/';

                // Only ADMIN and KEPALA_DAPUR go to dashboard
                if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'KEPALA_DAPUR') {
                    redirectPath = '/';
                } else if (role === 'CHEF') {
                    redirectPath = '/receipts';
                } else if (role === 'PEMBELI') {
                    redirectPath = '/purchases';
                } else if (role === 'PENERIMA') {
                    redirectPath = '/receipts';
                } else if (role === 'AHLI_GIZI') {
                    redirectPath = '/menus';
                }

                window.location.href = redirectPath;
            }
        } catch (err) {
            setError("Terjadi kesalahan. Silakan coba lagi.");
        } finally {
            setIsLoading(false);
        }
    };

    const fillCredentials = (email: string, password: string) => {
        setLoginData({ email, password });
        setError(null);
    };

    const handleSeed = async () => {
        setSeedStatus('loading');
        try {
            const res = await fetch('/api/seed');
            if (res.ok) {
                setSeedStatus('success');
                setTimeout(() => setSeedStatus('idle'), 3000);
            } else {
                setSeedStatus('error');
            }
        } catch (e) {
            setSeedStatus('error');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
            </div>

            <Card className="w-full max-w-md relative animate-fade-in z-10">
                <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
                            <ChefHat className="h-8 w-8 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">
                        Dapur<span className="text-accent">Stok</span>
                    </CardTitle>
                    <CardDescription>
                        Sistem Monitoring Stok Dapur Internal (Neon DB)
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="login-email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="login-email"
                                    type="email"
                                    placeholder="nama@perusahaan.id"
                                    className="pl-10"
                                    value={loginData.email}
                                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="login-password">Kata Sandi</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="pl-10 pr-10"
                                    value={loginData.password}
                                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                "Masuk"
                            )}
                        </Button>
                    </form>

                    {/* Seed Button for convenience */}
                    {/* <div className="mt-4 flex justify-center">
                        <Button variant="outline" size="sm" onClick={handleSeed} disabled={seedStatus === 'loading'}>
                            {seedStatus === 'loading' && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            {seedStatus === 'success' && <Check className="mr-2 h-3 w-3 text-green-500" />}
                            {seedStatus === 'error' && <AlertCircle className="mr-2 h-3 w-3 text-red-500" />}
                            Seed Database Users (Reset)
                        </Button>
                    </div> */}

                    {/* Demo Accounts Section */}
                    <div className="mt-6 pt-6 border-t border-border">
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Akun Demo</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {DEMO_ACCOUNTS.map((account) => (
                                <button
                                    key={account.role}
                                    type="button"
                                    onClick={() => fillCredentials(account.email, account.password)}
                                    className="text-left p-2 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                >
                                    <div className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                                        {account.role.replace("_", " ")}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate">
                                        {account.email}
                                    </div>
                                </button>
                            ))}
                        </div>
                        <p className="mt-3 text-[10px] text-muted-foreground text-center">
                            Klik untuk mengisi kredensial secara otomatis
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
