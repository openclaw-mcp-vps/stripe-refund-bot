"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { RefundPolicy } from "@/lib/types";

const formSchema = z.object({
  refundWindowDays: z.number().int().min(1).max(120),
  maxAutoRefundAmountUsd: z.number().min(1).max(10000),
  requireOrderIdentifier: z.boolean(),
  blockHighRiskLanguage: z.boolean(),
  blockedKeywords: z.string().min(1),
  excludedProductKeywords: z.string().optional(),
  autoReplyTemplate: z.string().min(16)
});

type FormValues = z.infer<typeof formSchema>;

function csvToArray(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

interface PolicySettingsProps {
  initialPolicy: RefundPolicy;
}

export default function PolicySettings({ initialPolicy }: PolicySettingsProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");

  const defaultValues = useMemo<FormValues>(
    () => ({
      refundWindowDays: initialPolicy.refundWindowDays,
      maxAutoRefundAmountUsd: Number((initialPolicy.maxAutoRefundAmountCents / 100).toFixed(2)),
      requireOrderIdentifier: initialPolicy.requireOrderIdentifier,
      blockHighRiskLanguage: initialPolicy.blockHighRiskLanguage,
      blockedKeywords: initialPolicy.blockedKeywords.join(", "),
      excludedProductKeywords: initialPolicy.excludedProductKeywords.join(", "),
      autoReplyTemplate: initialPolicy.autoReplyTemplate
    }),
    [initialPolicy]
  );

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const onSubmit = (values: FormValues) => {
    setMessage("");
    startTransition(async () => {
      const payload: RefundPolicy = {
        refundWindowDays: values.refundWindowDays,
        maxAutoRefundAmountCents: Math.round(values.maxAutoRefundAmountUsd * 100),
        requireOrderIdentifier: values.requireOrderIdentifier,
        blockHighRiskLanguage: values.blockHighRiskLanguage,
        blockedKeywords: csvToArray(values.blockedKeywords),
        excludedProductKeywords: csvToArray(values.excludedProductKeywords ?? ""),
        autoReplyTemplate: values.autoReplyTemplate
      };

      const response = await fetch("/api/policy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        setMessage("Unable to save policy. Check your access and try again.");
        return;
      }

      setMessage("Policy updated. New requests will use these rules.");
    });
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
      <h2 className="text-xl font-semibold">Refund Policy Settings</h2>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Define what can be auto-refunded versus flagged for manual review.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            Refund window (days)
            <input
              type="number"
              min={1}
              max={120}
              {...register("refundWindowDays", { valueAsNumber: true })}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2"
            />
            {errors.refundWindowDays ? (
              <span className="mt-1 block text-xs text-[var(--danger)]">
                {errors.refundWindowDays.message}
              </span>
            ) : null}
          </label>

          <label className="text-sm">
            Max auto-refund amount (USD)
            <input
              type="number"
              min={1}
              max={10000}
              step="0.01"
              {...register("maxAutoRefundAmountUsd", { valueAsNumber: true })}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2"
            />
            {errors.maxAutoRefundAmountUsd ? (
              <span className="mt-1 block text-xs text-[var(--danger)]">
                {errors.maxAutoRefundAmountUsd.message}
              </span>
            ) : null}
          </label>
        </div>

        <label className="text-sm">
          High-risk keywords (comma-separated)
          <input
            type="text"
            {...register("blockedKeywords")}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2"
          />
        </label>

        <label className="text-sm">
          Excluded product keywords (comma-separated)
          <input
            type="text"
            {...register("excludedProductKeywords")}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2"
          />
        </label>

        <label className="text-sm">
          Auto-reply template
          <textarea
            rows={4}
            {...register("autoReplyTemplate")}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2"
          />
        </label>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" {...register("requireOrderIdentifier")} className="h-4 w-4" />
            Require order ID before auto-refund
          </label>

          <label className="inline-flex items-center gap-2">
            <input type="checkbox" {...register("blockHighRiskLanguage")} className="h-4 w-4" />
            Block high-risk language for manual review
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-contrast)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Saving..." : "Save Policy"}
        </button>

        {message ? <p className="text-sm text-[var(--text-muted)]">{message}</p> : null}
      </form>
    </section>
  );
}
