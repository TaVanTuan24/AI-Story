"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import { z } from "zod";

import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, ApiClientError } from "@/lib/api/client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const { setSession } = useAuth();
  const { t } = useI18n();
  const { push } = useToast();

  const [values, setValues] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const registerSchema = useMemo(
    () =>
      z
        .object({
          displayName: z
            .string()
            .min(
              2,
              t(
                "auth.validation.displayName",
                "Display name must be at least 2 characters.",
              ),
            ),
          email: z.email(t("auth.validation.email", "Enter a valid email.")),
          password: z
            .string()
            .min(
              12,
              t(
                "auth.validation.passwordMin",
                "Password must be at least 12 characters.",
              ),
            )
            .max(
              100,
              t(
                "auth.validation.passwordMax",
                "Password must be 100 characters or fewer.",
              ),
            )
            .regex(
              /[A-Z]/,
              t(
                "auth.validation.passwordUppercase",
                "Password must include an uppercase letter.",
              ),
            )
            .regex(
              /[a-z]/,
              t(
                "auth.validation.passwordLowercase",
                "Password must include a lowercase letter.",
              ),
            )
            .regex(
              /[0-9]/,
              t(
                "auth.validation.passwordNumber",
                "Password must include a number.",
              ),
            ),
          confirmPassword: z
            .string()
            .min(
              12,
              t("auth.validation.confirmPassword", "Confirm your password."),
            ),
        })
        .refine((value) => value.password === value.confirmPassword, {
          message: t(
            "auth.validation.passwordMismatch",
            "Passwords do not match.",
          ),
          path: ["confirmPassword"],
        }),
    [t],
  );
  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.email(t("auth.validation.email", "Enter a valid email.")),
        password: z
          .string()
          .min(
            12,
            t(
              "auth.validation.passwordMin",
              "Password must be at least 12 characters.",
            ),
          ),
      }),
    [t],
  );

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
          Object.entries(fieldErrors).map(([key, value]) => [
            key,
            value?.[0] ?? t("common.invalidField", "Invalid field"),
          ]),
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
        title:
          mode === "register"
            ? t("auth.accountCreated")
            : t("auth.welcomeBack"),
        description:
          mode === "register"
            ? t("auth.libraryReady")
            : t("auth.sessionsReady"),
        tone: "success",
      });

      startTransition(() => {
        router.replace(next);
      });
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.code === "VALIDATION_ERROR"
      ) {
        const serverErrors = extractValidationErrors(error.details);
        if (Object.keys(serverErrors).length > 0) {
          setErrors(serverErrors);
        }
      }

      const message =
        error instanceof ApiClientError
          ? formatApiErrorMessage(error)
          : t("auth.serverError");
      push({
        title:
          mode === "register" ? t("auth.signupFailed") : t("auth.loginFailed"),
        description: message,
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-xl p-8 md:p-10">
      <p className="eyebrow-label text-xs font-semibold uppercase">
        {mode === "register"
          ? t("auth.createAccountEyebrow")
          : t("auth.welcomeBackEyebrow")}
      </p>
      <h1 className="mt-4 text-4xl font-semibold">
        {mode === "register" ? t("auth.registerTitle") : t("auth.loginTitle")}
      </h1>
      <p className="text-ui-muted mt-4 text-sm leading-7">
        {mode === "register"
          ? t("auth.registerDescription")
          : t("auth.loginDescription")}
      </p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        {mode === "register" ? (
          <Field
            label={t("auth.displayName")}
            error={errors.displayName}
            input={
              <Input
                value={values.displayName}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
                placeholder={t("auth.placeholders.displayName", "Mira Solis")}
              />
            }
          />
        ) : null}

        <Field
          label={t("auth.email")}
          error={errors.email}
          input={
            <Input
              type="email"
              value={values.email}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              placeholder={t("auth.placeholders.email", "you@example.com")}
            />
          }
        />

        <Field
          label={t("auth.password")}
          error={errors.password}
          input={
            <Input
              type="password"
              value={values.password}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder={t(
                "auth.placeholders.password",
                "At least 12 characters",
              )}
            />
          }
        />

        {mode === "register" ? (
          <Field
            label={t("auth.confirmPassword")}
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
                placeholder={t(
                  "auth.placeholders.confirmPassword",
                  "Repeat your password",
                )}
              />
            }
          />
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? mode === "register"
              ? t("auth.creatingAccount")
              : t("auth.loggingIn")
            : mode === "register"
              ? t("auth.createAccount")
              : t("auth.logIn")}
        </Button>
      </form>
    </Card>
  );
}

function extractValidationErrors(details: unknown): Record<string, string> {
  if (!details || typeof details !== "object" || !("fieldErrors" in details)) {
    return {};
  }

  const fieldErrors = (details as { fieldErrors?: Record<string, unknown> })
    .fieldErrors;
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
      {error ? (
        <span className="mt-2 block text-sm text-[color:var(--danger-strong)]">
          {error}
        </span>
      ) : null}
    </label>
  );
}
