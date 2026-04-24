import { cn } from "@/lib/utils/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold tracking-[0.01em] shadow-[var(--shadow-card)] transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-out outline-none focus-visible:-translate-y-0.5 focus-visible:border-[color:var(--accent)] focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)] disabled:cursor-not-allowed disabled:border-[color:var(--border)] disabled:bg-[color:var(--surface-disabled)] disabled:text-[color:var(--text-disabled)] disabled:shadow-none",
        variant === "primary" &&
          "border-[color:var(--button-primary-bg)] bg-[color:var(--button-primary-bg)] text-[color:var(--button-primary-text)] hover:-translate-y-0.5 hover:border-[color:var(--button-primary-hover)] hover:bg-[color:var(--button-primary-hover)] hover:shadow-[0_18px_34px_rgba(130,54,29,0.24)] active:translate-y-0 active:border-[color:var(--button-primary-active)] active:bg-[color:var(--button-primary-active)]",
        variant === "secondary" &&
          "border-[color:var(--border)] bg-[color:var(--button-secondary-bg)] text-[color:var(--button-secondary-text)] hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:bg-[color:var(--button-secondary-hover)] active:translate-y-0 active:bg-[color:var(--button-secondary-active)]",
        variant === "ghost" &&
          "border-transparent bg-transparent text-[color:var(--button-ghost-text)] shadow-none hover:bg-[color:var(--button-ghost-hover)] hover:text-[color:var(--text-primary)] active:bg-[color:var(--button-ghost-active)]",
        variant === "danger" &&
          "border-[color:var(--danger)] bg-[color:var(--danger)] text-[color:var(--button-primary-text)] hover:-translate-y-0.5 hover:border-[color:var(--danger-strong)] hover:bg-[color:var(--danger-strong)] hover:shadow-[var(--shadow-card)] active:translate-y-0 active:bg-[color:var(--danger-strong)]",
        className,
      )}
      {...props}
    />
  );
}
