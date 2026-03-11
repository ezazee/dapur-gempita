import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";

interface HeaderProps {
  title: string;
  description?: string;
}

import { MobileSidebar } from "./MobileSidebar";

export function Header({ title, description }: HeaderProps) {
  const { profile, signOut } = useAuth();

  // Get initials
  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-3 lg:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden overflow-hidden">
      <div className="flex items-center gap-2 lg:gap-4 min-w-0">
        <MobileSidebar />
        <div className="flex items-center gap-2 min-w-0">
          <div className="lg:hidden flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-transparent overflow-hidden">
            <Image
              src="/Logo.png"
              alt="Logo Gempita"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground truncate">{title}</h1>
            {description && (
              <p className="text-xs text-muted-foreground hidden lg:block truncate">{description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{profile?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{profile?.email || 'No email'}</p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
