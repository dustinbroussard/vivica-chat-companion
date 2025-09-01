
import { Menu, Sun, Moon, Bookmark, Sparkles, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeColor, ThemeVariant } from "@/hooks/useTheme";
import { ChatService } from "@/services/chatService";
import type { Profile } from "@/types/profile";

// Profile type centralized in src/types/profile

interface ChatHeaderProps {
  onMenuToggle: () => void;
  currentTitle: string;
  currentProfile: Profile | null;
  onProfileChange: (profile: Profile) => void;
  onOpenProfiles: () => void;
  onSaveSummary: () => void;
}

export const ChatHeader = ({
  onMenuToggle,
  currentProfile,
  onProfileChange,
  onOpenProfiles,
  onSaveSummary,
}: ChatHeaderProps) => {
  const { variant, setVariant } = useTheme();
  const [saving, setSaving] = useState(false);
  const [health, setHealth] = useState<'ok'|'degraded'|'open'>('ok');

  useEffect(() => {
    if (currentProfile?.model) {
      const h = ChatService.getModelHealth(currentProfile.model).state;
      setHealth(h);
    }
  }, [currentProfile?.model]);

  const handleSaveClick = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSaveSummary();
    } finally {
      setSaving(false);
    }
  };

  const toggleVariant = () => {
    setVariant(variant === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="md:hidden"
        >
          <Menu className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3">
          <ProfileSwitcher
            currentProfile={currentProfile}
            onProfileChange={onProfileChange}
            onOpenProfiles={onOpenProfiles}
          />
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Bookmark triggers the Save & Summarize flow */}
        <div className="text-xxs px-2 py-1 rounded border border-border mr-2 hidden sm:block"
          title={health === 'ok' ? 'Model healthy' : health === 'degraded' ? 'Model recently failed; watch performance' : 'Model unstable; using fallback if set'}
          style={{ color: health === 'ok' ? 'var(--foreground)' : health === 'degraded' ? '#b45309' : '#b91c1c' }}
        >
          Health: {health}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSaveClick}
          title="Save & Summarize conversation"
          disabled={saving}
          aria-busy={saving}
          className="relative"
        >
          <Bookmark className={cn('w-4 h-4', saving && 'opacity-0')} />
          {saving && (
            <span
              className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-md"
              aria-hidden="true"
            >
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
            </span>
          )}
          <span className="sr-only">
            {saving ? 'Saving conversation…' : 'Save & Summarize conversation'}
          </span>
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleVariant}>
          {variant === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};
