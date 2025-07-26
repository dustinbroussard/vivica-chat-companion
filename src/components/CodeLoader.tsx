import { cn } from "@/lib/utils";

export const CodeLoader = ({ className }: { className?: string }) => {
  return (
    <div 
      className={cn(
        "animate-pulse bg-muted rounded-md overflow-hidden relative",
        "before:content-[''] before:absolute before:inset-0 before:-translate-x-full",
        "before:bg-gradient-to-r before:from-transparent before:via-muted-foreground/10 before:to-transparent",
        "before:animate-[shimmer_1.5s_infinite]",
        className
      )}
      aria-busy="true"
      aria-label="AI is generating code..."
    >
      <div className="flex flex-col gap-2 p-4">
        <div className="h-4 w-3/4 bg-muted-foreground/20 rounded" />
        <div className="h-4 w-full bg-muted-foreground/20 rounded" />
        <div className="h-4 w-5/6 bg-muted-foreground/20 rounded" />
      </div>
    </div>
  );
};
