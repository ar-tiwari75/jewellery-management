import { useEffect, useState } from "react";
import {
  Building2,
  Mail,
  MapPin,
  Phone,
  Save,
} from "lucide-react";

import {
  getShopSettings,
  saveShopSettings,
  type ShopSettings,
} from "./shopSettings.service";

interface SettingsForm {
  shop_name: string;
  gstin: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  logo_url: string;
}

const EMPTY_FORM: SettingsForm = {
  shop_name: "",
  gstin: "",
  address: "",
  city: "",
  phone: "",
  email: "",
  logo_url: "",
};

function settingsToForm(
  settings: ShopSettings,
): SettingsForm {
  return {
    shop_name:
      settings.shop_name,

    gstin:
      settings.gstin ?? "",

    address:
      settings.address ?? "",

    city:
      settings.city ?? "",

    phone:
      settings.phone ?? "",

    email:
      settings.email ?? "",

    logo_url:
      settings.logo_url ?? "",
  };
}

export default function Settings() {
  const [form, setForm] =
    useState<SettingsForm>(
      EMPTY_FORM,
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);

      const settings =
        await getShopSettings();

      if (settings) {
        setForm(
          settingsToForm(settings),
        );
      }
    } catch (error) {
      console.error(
        "Failed to load settings:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load settings.",
      );
    } finally {
      setLoading(false);
    }
  }

  function updateField(
    field: keyof SettingsForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    try {
      setSaving(true);

      await saveShopSettings(form);

      setSuccess(
        "Shop settings saved successfully.",
      );
    } catch (error) {
      console.error(
        "Failed to save settings:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to save settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-[#71717A]">
          Loading settings...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-[#B08D57]">
          Settings
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#18181B]">
          Shop Settings
        </h1>

        <p className="mt-1 text-sm text-[#71717A]">
          These details will appear on your
          jewellery bills and invoices.
        </p>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="max-w-3xl space-y-6"
      >
        {/* Business information */}
        <section className="rounded-xl border border-[#E4E4E7] bg-white">
          <div className="flex items-center gap-3 border-b border-[#E4E4E7] px-5 py-5">
            <div className="rounded-lg bg-[#F5EFE6] p-2 text-[#B08D57]">
              <Building2 size={18} />
            </div>

            <div>
              <h2 className="font-semibold text-[#18181B]">
                Business Information
              </h2>

              <p className="mt-1 text-xs text-[#71717A]">
                Details displayed in the bill header.
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#18181B]">
                Jewellery / Shop Name
              </label>

              <input
                type="text"
                value={form.shop_name}
                onChange={(event) =>
                  updateField(
                    "shop_name",
                    event.target.value,
                  )
                }
                placeholder="Your Jewellery Shop"
                required
                className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#18181B]">
                GSTIN
              </label>

              <input
                type="text"
                value={form.gstin}
                onChange={(event) =>
                  updateField(
                    "gstin",
                    event.target.value,
                  )
                }
                placeholder="22AAAAA0000A1Z5"
                className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm uppercase outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#18181B]">
                Phone
              </label>

              <div className="relative mt-2">
                <Phone
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]"
                />

                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    updateField(
                      "phone",
                      event.target.value,
                    )
                  }
                  placeholder="9876543210"
                  className="w-full rounded-lg border border-[#D4D4D8] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#18181B]">
                Address
              </label>

              <div className="relative mt-2">
                <MapPin
                  size={16}
                  className="pointer-events-none absolute left-3 top-3 text-[#71717A]"
                />

                <textarea
                  value={form.address}
                  onChange={(event) =>
                    updateField(
                      "address",
                      event.target.value,
                    )
                  }
                  rows={2}
                  placeholder="Shop address"
                  className="w-full resize-none rounded-lg border border-[#D4D4D8] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#18181B]">
                City
              </label>

              <input
                type="text"
                value={form.city}
                onChange={(event) =>
                  updateField(
                    "city",
                    event.target.value,
                  )
                }
                placeholder="Mumbai"
                className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#18181B]">
                Email
              </label>

              <div className="relative mt-2">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]"
                />

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField(
                      "email",
                      event.target.value,
                    )
                  }
                  placeholder="shop@example.com"
                  className="w-full rounded-lg border border-[#D4D4D8] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Logo */}
        <section className="rounded-xl border border-[#E4E4E7] bg-white">
          <div className="border-b border-[#E4E4E7] px-5 py-5">
            <h2 className="font-semibold text-[#18181B]">
              Bill Logo
            </h2>

            <p className="mt-1 text-xs text-[#71717A]">
              We'll use this logo in the invoice
              template.
            </p>
          </div>

          <div className="p-5">
            <label className="block text-sm font-medium text-[#18181B]">
              Logo URL
            </label>

            <input
              type="url"
              value={form.logo_url}
              onChange={(event) =>
                updateField(
                  "logo_url",
                  event.target.value,
                )
              }
              placeholder="https://..."
              className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
            />

            <p className="mt-2 text-xs leading-5 text-[#71717A]">
              We'll replace this with proper logo
              upload/storage once the invoice
              template is finalized.
            </p>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#B08D57] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#9C7B4C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={17} />

            {saving
              ? "Saving..."
              : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}