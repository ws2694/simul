'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, GitBranch, Users, LogOut, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/lib/store';

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/knowledge-graph', label: 'Knowledge Graph', icon: GitBranch },
  { href: '/team', label: 'Teams', icon: Users },
];

export default function GameHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-lavender-light sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-lavender to-cosmic-purple flex items-center justify-center shadow-game-card group-hover:shadow-game-hover transition-shadow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading font-semibold text-lg text-game-text-dark">
            Cognitive State
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href ||
              (link.href !== '/' && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${isActive
                    ? 'bg-lavender-light text-cosmic-purple'
                    : 'text-game-text-light hover:bg-cream hover:text-game-text-dark'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full hover:bg-lavender-light"
              >
                <Avatar className="h-9 w-9 border-2 border-lavender">
                  <AvatarFallback className="bg-gradient-to-br from-lavender to-mint text-white font-medium">
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-48 bg-white border-lavender-light shadow-game-panel rounded-xl"
              align="end"
            >
              <div className="px-3 py-2 border-b border-lavender-light">
                <p className="text-sm font-medium text-game-text-dark">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-xs text-game-text-light">
                  {user?.email || ''}
                </p>
              </div>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-game-text-dark hover:bg-peach/30 cursor-pointer m-1 rounded-lg"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
