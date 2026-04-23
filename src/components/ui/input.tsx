import { cn } from "@/lib/utils/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-[1.35rem] border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-4 py-3.5 text-sm text-[color:var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-black/35 focus:border-[color:var(--accent)] focus:bg-white focus:ring-4 focus:ring-[color:var(--accent-soft)]",
        className,
      )}
      {...props}
    />
  );
}
