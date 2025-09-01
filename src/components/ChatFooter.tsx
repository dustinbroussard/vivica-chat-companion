
import { useState, useRef, useEffect } from "react";
import { Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatService } from "@/services/chatService";

interface ChatFooterProps {
  onSendMessage: (message: string) => void;
  editingMessage?: string | null;
}

export const ChatFooter = ({ onSendMessage, editingMessage }: ChatFooterProps) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cooldownMs, setCooldownMs] = useState(0);

  useEffect(() => {
    if (editingMessage !== undefined) {
      setMessage(editingMessage || "");
      if (editingMessage) textareaRef.current?.focus();
    }
  }, [editingMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [message]);

  // Poll for global rate-limit cooldown remaining
  useEffect(() => {
    const update = () => {
      setCooldownMs(ChatService.isPenalized() ? ChatService.penaltyRemaining() : 0);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
      <div className="max-w-4xl mx-auto">
        {cooldownMs > 0 && (
          <div className="mb-2 text-xs text-muted-foreground flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Cooling down to avoid rate limits — {Math.ceil(cooldownMs / 1000)}s
          </div>
        )}
        {editingMessage && (
          <div className="text-xs text-muted-foreground mb-2">Editing previous message</div>
        )}
        <form onSubmit={handleSubmit} className="flex items-end gap-3">

          {/* Message Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="min-h-[44px] max-h-[120px] resize-none pr-3 bg-background border-input"
            />
            
          </div>

          {/* Send Button */}
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim()}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {/* Character count */}
        {message.length > 0 && (
          <div className="text-xs text-muted-foreground mt-2 text-right">
            {message.length} characters
          </div>
        )}
      </div>
    </footer>
  );
};
