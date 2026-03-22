import { cn } from "@/lib/utils";

type LoadingProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
};

const sizeClasses = {
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-4",
  lg: "h-12 w-12 border-4",
};

const Loading = ({ className, size = "md", text }: LoadingProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-3 p-8",
      className,
    )}
  >
    <div
      className={cn(
        "animate-spin rounded-full border-muted border-t-primary",
        sizeClasses[size],
      )}
    />
    {text && (
      <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
    )}
  </div>
);

export default Loading;
