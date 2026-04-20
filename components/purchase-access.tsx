"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UnlockResponse = {
  success: boolean;
  message: string;
};

function withCheckoutParams(checkoutUrl: string, email: string): string {
  try {
    const url = new URL(checkoutUrl);
    url.searchParams.set("embed", "1");
    url.searchParams.set("media", "0");
    if (email) {
      url.searchParams.set("checkout[email]", email);
      url.searchParams.set("checkout[custom][unlock_email]", email);
    }
    return url.toString();
  } catch {
    return checkoutUrl;
  }
}

export function PurchaseAccess({ checkoutUrl }: { checkoutUrl: string | null }) {
  const [email, setEmail] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [status, setStatus] = useState<UnlockResponse | null>(null);
  const router = useRouter();
  const checkoutHref = useMemo(() => {
    if (!checkoutUrl) {
      return null;
    }
    return withCheckoutParams(checkoutUrl, email.trim().toLowerCase());
  }, [checkoutUrl, email]);

  async function onUnlock() {
    setStatus(null);
    setIsUnlocking(true);

    try {
      const response = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const payload = (await response.json()) as UnlockResponse;
      setStatus(payload);

      if (response.ok && payload.success) {
        router.push("/dashboard");
      }
    } catch {
      setStatus({ success: false, message: "Unlock failed. Try again after payment confirmation." });
    } finally {
      setIsUnlocking(false);
    }
  }

  return (
    <div className="mt-6 grid gap-3 rounded-2xl border border-white/15 bg-[#0d1523]/80 p-4 sm:grid-cols-[1.4fr_auto] sm:items-end">
      <div className="space-y-2">
        <label htmlFor="unlock-email" className="text-sm font-semibold text-[#d6e3f1]">
          Billing email
        </label>
        <Input
          id="unlock-email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <p className="text-xs text-[#95abc2]">
          Use the same email from checkout so the webhook can grant access correctly.
        </p>
      </div>

      <div className="grid gap-2 sm:min-w-[220px]">
        <Button asChild className="bg-amber-500 text-black hover:bg-amber-400" disabled={!checkoutHref || !email.trim()}>
          <a className={!checkoutHref || !email.trim() ? "pointer-events-none" : "lemonsqueezy-button"} href={checkoutHref ?? "#"}>
            Start Checkout
          </a>
        </Button>
        <Button variant="outline" onClick={onUnlock} disabled={isUnlocking || !email.trim()}>
          {isUnlocking ? "Verifying..." : "Unlock Dashboard"}
        </Button>
      </div>

      {status ? (
        <p className={`text-sm ${status.success ? "text-emerald-300" : "text-red-300"} sm:col-span-2`}>
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
