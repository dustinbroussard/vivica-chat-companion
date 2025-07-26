import { cn } from "@/lib/utils";

export const CodeLoader = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "relative bg-muted rounded-md overflow-hidden",
        "border border-muted-foreground/10",
        "animate-pulse",
        className
      )}
      aria-busy="true"
      aria-label="AI is generating code..."
    >
      <div className="flex flex-col gap-4 p-4">
        {/* Fake header line like terminal */}
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
            <div className="w-3 h-3 rounded-full bg-green-400/50" />
          </div>
          <div className="h-4 w-full bg-muted-foreground/10 rounded-sm" />
        </div>
        
        {/* Fake content lines */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 w-5 bg-muted-foreground/5 rounded-sm" />
            <div 
              className={cn(
                "h-4 rounded-sm bg-muted-foreground/10",
                i % 2 === 0 ? 'w-full' : 'w-3/4',
                i === 4 && 'w-1/2',
              )}
            />
          </div>
        ))}
        
        {/* Blinking cursor animation */}
        <div className="absolute bottom-4 left-12 h-5 w-0.5 bg-blue-500 animate-[blink_1s_infinite]" />
      </div>
      
      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};
