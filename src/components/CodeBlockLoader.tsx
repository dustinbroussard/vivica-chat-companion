import { Skeleton } from "@/components/ui/skeleton";

export function CodeBlockLoader() {
  return (
    <div className="code-block-container" role="status" aria-busy="true">
      <Skeleton className="code-block" />
      <span className="sr-only">AI is generating code...</span>
    </div>
  );
}
