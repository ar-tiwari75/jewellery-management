import { useEffect, useMemo, useState } from "react";
import {
  Edit3,
  Phone,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";

import {
  createCustomer,
  getCustomers,
  updateCustomer,
  type Customer,
} from "./customer.service";

interface CustomerFormState {
  full_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  anniversary_date: string;
  address: string;
  city: string;
  notes: string;
}

const EMPTY_FORM: CustomerFormState = {
  full_name: "",
  phone: "",
  email: "",
  date_of_birth: "",
  anniversary_date: "",
  address: "",
  city: "",
  notes: "",
};

function customerToForm(
  customer: Customer,
): CustomerFormState {
  return {
    full_name:
      customer.full_name,

    phone:
      customer.phone,

    email:
      customer.email ?? "",

    date_of_birth:
      customer.date_of_birth ?? "",

    anniversary_date:
      customer.anniversary_date ?? "",

    address:
      customer.address ?? "",

    city:
      customer.city ?? "",

    notes:
      customer.notes ?? "",
  };
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(
    `${value}T00:00:00`,
  );

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

export default function Customers() {
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);

  const [form, setForm] =
    useState<CustomerFormState>(
      EMPTY_FORM,
    );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    try {
      setLoading(true);
      setError(null);

      const result =
        await getCustomers();

      setCustomers(result);
    } catch (error) {
      console.error(
        "Failed to load customers:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load customers.",
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return customers;
      }

      return customers.filter(
        (customer) =>
          customer.full_name
            .toLowerCase()
            .includes(query) ||
          customer.phone
            .toLowerCase()
            .includes(query) ||
          customer.customer_code
            .toLowerCase()
            .includes(query) ||
          customer.email
            ?.toLowerCase()
            .includes(query),
      );
    }, [customers, search]);

  function openAddModal() {
    setEditingCustomer(null);
    setForm(EMPTY_FORM);
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  }

  function openEditModal(
    customer: Customer,
  ) {
    setEditingCustomer(customer);
    setForm(
      customerToForm(customer),
    );
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingCustomer(null);
    setForm(EMPTY_FORM);
  }

  function updateForm(
    field: keyof CustomerFormState,
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

    if (!form.full_name.trim()) {
      setError(
        "Customer name is required.",
      );
      return;
    }

    if (!form.phone.trim()) {
      setError(
        "Phone number is required.",
      );
      return;
    }

    try {
      setSaving(true);

      if (editingCustomer) {
        const updated =
          await updateCustomer(
            editingCustomer.id,
            form,
          );

        setCustomers(
          (current) =>
            current.map((customer) =>
              customer.id ===
              updated.id
                ? updated
                : customer,
            ),
        );

        setSuccess(
          "Customer updated successfully.",
        );
      } else {
        const created =
          await createCustomer(
            form,
          );

        setCustomers(
          (current) => [
            ...current,
            created,
          ].sort((a, b) =>
            a.full_name.localeCompare(
              b.full_name,
            ),
          ),
        );

        setSuccess(
          "Customer added successfully.",
        );
      }

      setTimeout(() => {
        setModalOpen(false);
        setEditingCustomer(null);
        setForm(EMPTY_FORM);
        setSuccess(null);
      }, 700);
    } catch (error) {
      console.error(
        "Failed to save customer:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to save customer.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#B08D57]">
            Customers
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#18181B]">
            Customer Management
          </h1>

          <p className="mt-1 text-sm text-[#71717A]">
            Manage customer information and
            billing history.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#B08D57] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9C7B4C]"
        >
          <Plus size={17} />
          Add Customer
        </button>
      </section>

      {/* Alerts */}
      {error && !modalOpen && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Customer list */}
      <section className="rounded-xl border border-[#E4E4E7] bg-white">
        <div className="flex flex-col gap-4 border-b border-[#E4E4E7] px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-[#18181B]">
              Customers
            </h2>

            <p className="mt-1 text-xs text-[#71717A]">
              {customers.length}{" "}
              {customers.length === 1
                ? "customer"
                : "customers"}{" "}
              registered
            </p>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search name, phone or code..."
              className="w-full rounded-lg border border-[#D4D4D8] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <p className="text-sm text-[#71717A]">
              Loading customers...
            </p>
          </div>
        ) : filteredCustomers.length ===
          0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <div className="rounded-full bg-[#F5EFE6] p-4 text-[#B08D57]">
              <UserRound size={22} />
            </div>

            <p className="mt-4 text-sm font-medium text-[#18181B]">
              {search
                ? "No customers found"
                : "No customers yet"}
            </p>

            <p className="mt-1 max-w-sm text-xs leading-5 text-[#71717A]">
              {search
                ? "Try searching with a different name, phone number or customer code."
                : "Add your first customer to start using customer-linked billing."}
            </p>

            {!search && (
              <button
                type="button"
                onClick={openAddModal}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#D4D4D8] px-3 py-2 text-sm font-medium text-[#18181B] hover:bg-[#FAFAFA]"
              >
                <Plus size={16} />
                Add Customer
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-[#E4E4E7] bg-[#FAFAFA] text-left">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-[#71717A]">
                    Customer
                  </th>

                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-[#71717A]">
                    Contact
                  </th>

                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-[#71717A]">
                    City
                  </th>

                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-[#71717A]">
                    Birthday
                  </th>

                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-[#71717A]">
                    Customer Code
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#71717A]">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map(
                  (customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-[#F0F0F1] last:border-b-0 hover:bg-[#FCFCFB]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5EFE6] text-sm font-semibold text-[#B08D57]">
                            {customer.full_name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <p className="text-sm font-medium text-[#18181B]">
                              {
                                customer.full_name
                              }
                            </p>

                            {customer.email && (
                              <p className="mt-0.5 text-xs text-[#71717A]">
                                {
                                  customer.email
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-[#18181B]">
                          <Phone
                            size={14}
                            className="text-[#B08D57]"
                          />

                          {
                            customer.phone
                          }
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-[#71717A]">
                        {customer.city ||
                          "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-[#71717A]">
                        {formatDate(
                          customer.date_of_birth,
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-md bg-[#F5F5F4] px-2 py-1 font-mono text-xs text-[#52525B]">
                          {
                            customer.customer_code
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(
                              customer,
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4D4D8] px-3 py-2 text-xs font-medium text-[#18181B] hover:bg-[#FAFAFA]"
                        >
                          <Edit3
                            size={14}
                          />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add/Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-[#E4E4E7] px-5 py-5">
              <div>
                <p className="text-sm font-medium text-[#B08D57]">
                  Customer
                </p>

                <h2 className="mt-1 text-xl font-semibold text-[#18181B]">
                  {editingCustomer
                    ? "Edit Customer"
                    : "Add Customer"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B]"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-5"
            >
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[#18181B]">
                    Full name
                  </label>

                  <input
                    type="text"
                    value={
                      form.full_name
                    }
                    onChange={(event) =>
                      updateForm(
                        "full_name",
                        event.target
                          .value,
                      )
                    }
                    placeholder="Customer full name"
                    required
                    className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#18181B]">
                    Phone
                  </label>

                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateForm(
                        "phone",
                        event.target
                          .value,
                      )
                    }
                    placeholder="Phone number"
                    required
                    className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#18181B]">
                    Email
                  </label>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateForm(
                        "email",
                        event.target
                          .value,
                      )
                    }
                    placeholder="customer@email.com"
                    className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#18181B]">
                    Date of birth
                  </label>

                  <input
                    type="date"
                    value={
                      form.date_of_birth
                    }
                    onChange={(event) =>
                      updateForm(
                        "date_of_birth",
                        event.target
                          .value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#18181B]">
                    Anniversary
                  </label>

                  <input
                    type="date"
                    value={
                      form.anniversary_date
                    }
                    onChange={(event) =>
                      updateForm(
                        "anniversary_date",
                        event.target
                          .value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[#18181B]">
                    Address
                  </label>

                  <textarea
                    value={
                      form.address
                    }
                    onChange={(event) =>
                      updateForm(
                        "address",
                        event.target
                          .value,
                      )
                    }
                    rows={2}
                    placeholder="Street, area, building..."
                    className="mt-2 w-full resize-none rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#18181B]">
                    City
                  </label>

                  <input
                    type="text"
                    value={form.city}
                    onChange={(event) =>
                      updateForm(
                        "city",
                        event.target
                          .value,
                      )
                    }
                    placeholder="Mumbai"
                    className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[#18181B]">
                    Notes
                  </label>

                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      updateForm(
                        "notes",
                        event.target
                          .value,
                      )
                    }
                    rows={3}
                    placeholder="Optional customer notes..."
                    className="mt-2 w-full resize-none rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#E4E4E7] pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-[#D4D4D8] px-4 py-2.5 text-sm font-medium text-[#18181B] hover:bg-[#FAFAFA]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#B08D57] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9C7B4C] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingCustomer
                      ? "Save Changes"
                      : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
