import { cn } from "@/lib/utils/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-[1.35rem] border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-4 py-3.5 text-sm text-[color:var(--text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-[border-color,box-shadow,background-color,color] duration-200 outline-none placeholder:text-[color:var(--placeholder)] focus:border-[color:var(--accent)] focus:bg-[color:var(--surface-selected)] focus:text-[color:var(--text-primary)] focus:ring-4 focus:ring-[color:var(--focus-ring)] disabled:cursor-not-allowed disabled:border-[color:var(--border)] disabled:bg-[color:var(--surface-disabled)] disabled:text-[color:var(--text-disabled)]",
        className,
      )}
      {...props}
    />
  );
}
