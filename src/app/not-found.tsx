'use client';


import { useEffect } from "react";
import Link from "next/link"; // Changed from react-router-dom
import { Button } from "@/components/ui/button";

export default function NotFound() {
    // const location = useLocation(); // Not available in Next.js easily on server/client unless via usePathname
    // Using usePathname if needed, but for 404 we usually just show message.

    useEffect(() => {
        console.error(
            "404 Error: User attempted to access non-existent route"
        );
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="text-xl text-foreground mb-4">Oops! Halaman tidak ditemukan</p>
                <Button asChild>
                    <Link href="/">
                        Kembali ke Dashboard
                    </Link>
                </Button>
            </div>
        </div>
    );
}
