import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

interface SubscriptionInfo {
  status: string;
  plan: string;
  expiryDate: string | null;
  isExpired: boolean;
  daysLeft: number | null;
}

interface SubscriptionContextType {
  subscription: SubscriptionInfo | null;
  loading: boolean;
}

const SubscriptionContext =
  createContext<SubscriptionContextType>({
    subscription: null,
    loading: true,
  });

function daysBetween(
  a: Date,
  b: Date,
): number {
  const msPerDay =
    1000 * 60 * 60 * 24;

  return Math.ceil(
    (b.getTime() - a.getTime()) / msPerDay,
  );
}

export function SubscriptionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = useAuth();

  const [subscription, setSubscription] =
    useState<SubscriptionInfo | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!profile?.shop_id) {
        if (mounted) {
          setLoading(false);
        }

        return;
      }

      try {
        const { data, error } =
          await supabase
            .from("shops")
            .select(
              "subscription_status, subscription_expiry_date, subscription_plan",
            )
            .eq("id", profile.shop_id)
            .single();

        if (error || !data) {
          console.error(
            "Failed to load subscription:",
            error,
          );

          if (mounted) {
            setSubscription({
              status: "active",
              plan: "free",
              expiryDate: null,
              isExpired: false,
              daysLeft: null,
            });
          }

          return;
        }

        const now = new Date();

        const expiryDate =
          data.subscription_expiry_date
            ? new Date(
                data.subscription_expiry_date,
              )
            : null;

        const isExpired =
          data.subscription_status ===
            "expired" ||
          (expiryDate !== null &&
            expiryDate < now);

        const daysLeft =
          expiryDate !== null
            ? daysBetween(now, expiryDate)
            : null;

        if (mounted) {
          setSubscription({
            status:
              data.subscription_status,
            plan:
              data.subscription_plan,
            expiryDate:
              data.subscription_expiry_date,
            isExpired,
            daysLeft,
          });
        }
      } catch (err) {
        console.error(
          "Failed to load subscription:",
          err,
        );

        if (mounted) {
          setSubscription({
            status: "active",
            plan: "free",
            expiryDate: null,
            isExpired: false,
            daysLeft: null,
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [profile?.shop_id]);

  return (
    <SubscriptionContext.Provider
      value={{ subscription, loading }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
