import { Loader2 } from "lucide-react";

export function FullPageSpinner({ description }: { description: string }) {
  return (
    <div className="flex flex-col h-full justify-center items-center">
      <Loader2 className="h-10 w-10 animate-spin" />
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
