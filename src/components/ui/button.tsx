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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold tracking-[0.01em] shadow-[var(--shadow-card)] transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-out outline-none focus-visible:-translate-y-0.5 focus-visible:border-[color:var(--accent)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-55",
        variant === "primary" &&
          "bg-[color:var(--accent)] text-white hover:-translate-y-0.5 hover:bg-[color:var(--accent-strong)] hover:shadow-[0_18px_34px_rgba(130,54,29,0.24)]",
        variant === "secondary" &&
          "border border-[color:var(--border)] bg-[color:var(--surface-elevated)] text-black/80 hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:bg-white",
        variant === "ghost" &&
          "bg-transparent text-black/65 shadow-none hover:bg-black/5 hover:text-black",
        variant === "danger" &&
          "bg-[color:var(--danger)] text-white hover:-translate-y-0.5 hover:bg-[#7d2121] hover:shadow-[0_18px_34px_rgba(122,33,33,0.22)]",
        className,
      )}
      {...props}
    />
  );
}
