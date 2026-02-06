import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChefHat, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

// Demo accounts untuk testing
const DEMO_ACCOUNTS = [
  { role: "SUPER_ADMIN", email: "admin@dapur.id", password: "admin123", name: "Admin Utama" },
  { role: "AHLI_GIZI", email: "gizi@dapur.id", password: "gizi1234", name: "Ahli Gizi" },
  { role: "PEMBELI", email: "pembeli@dapur.id", password: "pembeli1", name: "Pembeli" },
  { role: "PENERIMA", email: "penerima@dapur.id", password: "penerima", name: "Penerima Barang" },
  { role: "CHEF", email: "chef@dapur.id", password: "chef1234", name: "Chef Dapur" },
  { role: "KEPALA_DAPUR", email: "kepala@dapur.id", password: "kepala12", name: "Kepala Dapur" },
];

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  const from = location.state?.from?.pathname || "/";

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate
    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    
    const { error } = await signIn(loginData.email, loginData.password);
    
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setError("Email atau password salah");
      } else if (error.message.includes("Email not confirmed")) {
        setError("Email belum dikonfirmasi. Silakan cek inbox Anda.");
      } else {
        setError(error.message);
      }
    }
    
    setIsLoading(false);
  };

  const fillCredentials = (email: string, password: string) => {
    setLoginData({ email, password });
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative animate-fade-in">
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
            Sistem Monitoring Stok Dapur Internal
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

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Dengan masuk, Anda menyetujui{" "}
            <a href="#" className="text-primary hover:underline">Ketentuan Layanan</a>
            {" "}dan{" "}
            <a href="#" className="text-primary hover:underline">Kebijakan Privasi</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
