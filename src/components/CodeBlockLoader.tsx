import { Skeleton } from "@/components/ui/skeleton";

export function CodeBlockLoader() {
  return (
    <div className="code-block-container space-y-2" role="status" aria-busy="true">
      <Skeleton className="code-block" />
      <div className="h-1 w-full bg-muted overflow-hidden rounded relative">
        <div className="absolute inset-0 w-1/3 bg-accent animate-indeterminate" />
      </div>
      <span className="sr-only">AI is generating code...</span>
    </div>
  );
}
