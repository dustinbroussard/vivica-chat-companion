
import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ApiKeyInputProps {
  onApiKeyChange: (apiKey: string) => void;
}

export const ApiKeyInput = ({ onApiKeyChange }: ApiKeyInputProps) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Load API key from localStorage on mount
    const savedKey = localStorage.getItem('openrouter-api-key');
    if (savedKey) {
      setApiKey(savedKey);
      onApiKeyChange(savedKey);
    }
  }, [onApiKeyChange]);

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      localStorage.removeItem('openrouter-api-key');
      onApiKeyChange('');
      toast.success('API key removed');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${trimmed}` }
      });

      if (!res.ok) {
        throw new Error('Invalid API key');
      }

      localStorage.setItem('openrouter-api-key', trimmed);
      onApiKeyChange(trimmed);
      toast.success('API key verified and saved');
    } catch (e) {
      toast.error('API key validation failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center gap-2">
        <Key className="w-4 h-4" />
        <Label className="text-sm font-semibold">OpenRouter API Key</Label>
      </div>
      
      <div className="space-y-2">
        <div className="relative">
          <Input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-or-v1-..."
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-8 w-8 p-0"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
        
        <Button onClick={handleSave} size="sm" className="w-full" disabled={isVerifying}>
          {isVerifying ? 'Verifying...' : 'Save API Key'}
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Your API key is stored locally and never sent to our servers. 
          Get your key from{' '}
          <a 
            href="https://openrouter.ai/keys" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            OpenRouter
          </a>
        </p>
      </div>
    </div>
  );
};
