"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { z } from "zod";

import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, ApiClientError } from "@/lib/api/client";

const registerSchema = z
  .object({
    displayName: z.string().min(2, "Display name must be at least 2 characters."),
    email: z.email("Enter a valid email."),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters.")
      .max(100, "Password must be 100 characters or fewer.")
      .regex(/[A-Z]/, "Password must include an uppercase letter.")
      .regex(/[a-z]/, "Password must include a lowercase letter.")
      .regex(/[0-9]/, "Password must include a number."),
    confirmPassword: z.string().min(12, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const loginSchema = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(12, "Password must be at least 12 characters."),
});

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const { setSession } = useAuth();
  const { push } = useToast();

  const [values, setValues] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const validation =
      mode === "register"
        ? registerSchema.safeParse(values)
        : loginSchema.safeParse(values);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, value]) => [key, value?.[0] ?? "Invalid field"]),
        ),
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const result =
        mode === "register"
          ? await api.register({
              email: values.email,
              displayName: values.displayName,
              password: values.password,
            })
          : await api.login({
              email: values.email,
              password: values.password,
            });

      setSession({
        token: result.token,
        user: result.user,
      });

      push({
        title: mode === "register" ? "Account created" : "Welcome back",
        description:
          mode === "register"
            ? "Your library is ready."
            : "Your story sessions are ready to continue.",
        tone: "success",
      });

      startTransition(() => {
        router.replace(next);
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "VALIDATION_ERROR") {
        const serverErrors = extractValidationErrors(error.details);
        if (Object.keys(serverErrors).length > 0) {
          setErrors(serverErrors);
        }
      }

      const message =
        error instanceof ApiClientError
          ? formatApiErrorMessage(error)
          : "Something went wrong while reaching the server.";
      push({
        title: mode === "register" ? "Sign-up failed" : "Login failed",
        description: message,
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-xl p-8 md:p-10">
      <p className="text-xs font-semibold tracking-[0.35em] uppercase text-[color:var(--accent)]">
        {mode === "register" ? "Create Account" : "Welcome Back"}
      </p>
      <h1 className="mt-4 text-4xl font-semibold">
        {mode === "register"
          ? "Start your next impossible story"
          : "Return to your library"}
      </h1>
      <p className="mt-4 text-sm leading-7 text-black/70">
        {mode === "register"
          ? "Create an account to generate, save, and continue AI-driven interactive fiction sessions."
          : "Sign in to continue your active sessions, browse your history, and tune your preferences."}
      </p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        {mode === "register" ? (
          <Field
            label="Display name"
            error={errors.displayName}
            input={
              <Input
                value={values.displayName}
                onChange={(event) =>
                  setValues((current) => ({ ...current, displayName: event.target.value }))
                }
                placeholder="Mira Solis"
              />
            }
          />
        ) : null}

        <Field
          label="Email"
          error={errors.email}
          input={
            <Input
              type="email"
              value={values.email}
              onChange={(event) =>
                setValues((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="you@example.com"
            />
          }
        />

        <Field
          label="Password"
          error={errors.password}
          input={
            <Input
              type="password"
              value={values.password}
              onChange={(event) =>
                setValues((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="At least 12 characters"
            />
          }
        />

        {mode === "register" ? (
          <Field
            label="Confirm password"
            error={errors.confirmPassword}
            input={
              <Input
                type="password"
                value={values.confirmPassword}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                placeholder="Repeat your password"
              />
            }
          />
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? mode === "register"
              ? "Creating account..."
              : "Logging in..."
            : mode === "register"
              ? "Create account"
              : "Log in"}
        </Button>
      </form>
    </Card>
  );
}

function extractValidationErrors(details: unknown): Record<string, string> {
  if (!details || typeof details !== "object" || !("fieldErrors" in details)) {
    return {};
  }

  const fieldErrors = (details as { fieldErrors?: Record<string, unknown> }).fieldErrors;
  if (!fieldErrors) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(fieldErrors)
      .map(([field, messages]) => [
        field,
        Array.isArray(messages) ? String(messages[0] ?? "") : "",
      ])
      .filter(([, message]) => message.length > 0),
  );
}

function formatApiErrorMessage(error: ApiClientError) {
  const serverErrors = extractValidationErrors(error.details);
  const firstFieldMessage = Object.values(serverErrors)[0];

  if (firstFieldMessage) {
    return firstFieldMessage;
  }

  return error.message;
}

function Field({
  label,
  input,
  error,
}: {
  label: string;
  input: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {input}
      {error ? <span className="mt-2 block text-sm text-[#9c2f2f]">{error}</span> : null}
    </label>
  );
}
