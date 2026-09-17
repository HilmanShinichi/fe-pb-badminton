import { useState } from "react";
import { ApiError } from "../store/baseApi";
import {
  useAdjustMutation,
  useCreateProductMutation,
  useDeleteProductMutation,
  useInventoryTxQuery,
  useProductsQuery,
  usePurchaseMutation,
  useUpdateProductMutation,
} from "../store/services";
import type { Product } from "../types";
import { dateId, rupiah } from "../format";
import { Badge, Btn, ConfirmModal, DeleteRowButton, Empty, ErrorBox, Field, Loading, MoneyInput, PageHead } from "../ui";

export function InventoryPage() {
  const products = useProductsQuery();
  const tx = useInventoryTxQuery();
  const [createProduct, createState] = useCreateProductMutation();
  const [updateProduct, updateState] = useUpdateProductMutation();
  const [removeProduct, removeState] = useDeleteProductMutation();
  const [purchase, purchaseState] = usePurchaseMutation();
  const [adjust, adjustState] = useAdjustMutation();

  const [productForm, setProductForm] = useState({ name: "", units_per_pack: 12, purchase_price: 125000, purpose: "GENERAL" });
  const [productError, setProductError] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ name: "", units_per_pack: 12, purchase_price: 125000, purpose: "GENERAL", active: true });
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [forceArmed, setForceArmed] = useState(false);
  const [buyForm, setBuyForm] = useState({ product_id: "", packs: 1, unit_price: 125000, pcs: 1, pcs_total: 10000, note: "" });
  const [buyMode, setBuyMode] = useState<"packs" | "pcs">("packs");
  const [buyError, setBuyError] = useState("");
  // When true, pcs_total auto-follows the selected product's pack price.
  // Typing a total manually turns auto off until product/mode changes.
  const [pcsAuto, setPcsAuto] = useState(true);
  const [adjForm, setAdjForm] = useState({ product_id: "", units: -1, note: "" });
  const [adjError, setAdjError] = useState("");
  const [counted, setCounted] = useState("");

  async function submitProduct() {
    try {
      await createProduct({ ...productForm, name: productForm.name.trim(), unit_name: "pc" }).unwrap();
      setProductForm({ name: "", units_per_pack: 12, purchase_price: 125000, purpose: "GENERAL" });
      setProductError("");
    } catch (e) {
      setProductError(e instanceof ApiError ? e.message : "Could not save product.");
    }
  }

  function startEdit(p: Product) {
    setEditing(p);
    setEditForm({ name: p.name, units_per_pack: p.units_per_pack, purchase_price: p.purchase_price, purpose: p.purpose ?? "GENERAL", active: p.active });
    setProductError("");
  }

  async function submitEdit() {
    if (!editing) return;
    try {
      await updateProduct({ id: editing.id, body: { ...editForm, name: editForm.name.trim() } }).unwrap();
      setEditing(null);
      setProductError("");
    } catch (e) {
      setProductError(e instanceof ApiError ? e.message : "Could not save product.");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await removeProduct({ id: pendingDelete.id, force: forceArmed }).unwrap();
      setPendingDelete(null);
      setForceArmed(false);
      setProductError("");
    } catch (e) {
      if (e instanceof ApiError && e.code === "PRODUCT_HAS_HISTORY" && !forceArmed) {
        // Has transactions: escalate the modal to a force-delete warning.
        setForceArmed(true);
      } else {
        setProductError(e instanceof ApiError ? e.message : "Could not delete product.");
        setPendingDelete(null);
        setForceArmed(false);
      }
    }
  }

  function askDelete(p: Product) {
    setPendingDelete(p);
    setForceArmed(false);
  }

  async function submitPurchase() {
    try {
      await purchase({
        product_id: buyForm.product_id,
        packs: buyMode === "packs" ? buyForm.packs : 0,
        unit_price: buyMode === "packs" ? buyForm.unit_price : 0,
        pcs: buyMode === "pcs" ? buyForm.pcs : 0,
        pcs_total: buyMode === "pcs" ? buyForm.pcs_total : 0,
        note: buyForm.note.trim() || null,
      }).unwrap();
      setBuyForm({ ...buyForm, packs: 1, pcs: 1, note: "" });
      setBuyError("");
    } catch (e) {
      setBuyError(e instanceof ApiError ? e.message : "Could not record purchase.");
    }
  }

  async function submitAdjust() {
    try {
      await adjust({
        product_id: adjForm.product_id,
        units: adjForm.units,
        note: adjForm.note.trim() || null,
      }).unwrap();
      setAdjForm({ ...adjForm, units: -1, note: "" });
      setCounted("");
      setAdjError("");
    } catch (e) {
      setAdjError(e instanceof ApiError ? e.message : "Could not record adjustment.");
    }
  }

  const list = products.data ?? [];
  const adjStock = list.find((p) => p.id === adjForm.product_id)?.stock ?? 0;

  // Pro-rata total from the product's pack price (e.g. 12 pcs of a Rp125.000
  // pack ≈ Rp125.000). Used to auto-fill loose-purchase totals.
  function autoTotal(productId: string, pcs: number): number {
    const p = (products.data ?? []).find((x) => x.id === productId);
    if (!p || pcs <= 0 || !p.units_per_pack) return 0;
    return Math.round((pcs * p.purchase_price) / p.units_per_pack);
  }
  const deficit = list.find((p) => p.stock < 0);

  return (
    <div>
      <PageHead title="Inventory" sub="Tube stock, purchases, and corrections. Usage is recorded automatically from matches." />
      {deficit && (
        <div role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{deficit.name} stock is {deficit.stock} {deficit.unit_name}.</strong> Usage was recorded
          without a matching purchase (e.g. from a daily session).{" "}
          <button
            type="button"
            className="font-semibold underline"
              onClick={() => {
                setBuyMode("packs");
                setBuyForm({
                  ...buyForm,
                  product_id: deficit.id,
                  packs: Math.max(1, Math.ceil(Math.abs(deficit.stock) / Math.max(1, deficit.units_per_pack))),
                  unit_price: deficit.purchase_price,
                  note: "",
                });
              }}
          >
            Fill buy form to cover it
          </button>
        </div>
      )}
      <section aria-label="Stock" className="mb-5 rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-sm font-semibold">Current stock</h2>
        {products.isFetching && !products.data ? (
          <Loading />
        ) : products.isError ? (
          <div className="p-3"><ErrorBox message="Could not load stock." onRetry={() => products.refetch()} /></div>
        ) : list.length === 0 ? (
          <div className="p-3"><Empty text="No products yet." /></div>
        ) : (
          <table className="data">
            <thead>
              <tr><th>Product</th><th>For</th><th className="text-right">Units/pack</th><th className="text-right">Pack price</th><th className="text-right">Stock</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td><Badge status={p.purpose ?? "GENERAL"} /></td>
                  <td className="text-right tabular-nums">{p.units_per_pack} {p.unit_name}</td>
                  <td className="text-right tabular-nums">{rupiah(p.purchase_price)}</td>
                  <td className="text-right font-semibold tabular-nums">{p.stock} {p.unit_name}</td>
                  <td className="whitespace-nowrap text-right">
                    <span className="inline-flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold hover:bg-court/60"
                      >
                        Edit
                      </button>
                      <DeleteRowButton onClick={() => askDelete(p)} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {editing && (
        <section aria-label="Edit product" className="mb-5 rounded-xl border border-pine bg-white shadow-card p-3">
          <h2 className="mb-3 text-sm font-semibold">Edit product · {editing.name}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <Field label="Name">
              <input id="edit-nama-produk" className="w-full" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </Field>
            <Field label="Units per pack">
              <input id="edit-isi-pack" type="number" min={1} className="w-full" value={editForm.units_per_pack} onChange={(e) => setEditForm({ ...editForm, units_per_pack: Number(e.target.value) })} />
            </Field>
            <Field label="Price per pack (Rp)">
              <MoneyInput id="edit-harga-pack" value={editForm.purchase_price} onChange={(n) => setEditForm({ ...editForm, purchase_price: n })} />
            </Field>
            <Field label="Used for">
              <select id="edit-tujuan-produk" className="w-full" value={editForm.purpose} onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}>
                <option value="GENERAL">Both (shared)</option>
                <option value="DAILY">Daily open play</option>
                <option value="PERIOD">Period</option>
              </select>
            </Field>
            <Field label="Active">
              <select id="edit-aktif" className="w-full" value={editForm.active ? "yes" : "no"} onChange={(e) => setEditForm({ ...editForm, active: e.target.value === "yes" })}>
                <option value="yes">Active</option>
                <option value="no">Inactive</option>
              </select>
            </Field>
            <div className="flex items-end gap-2">
              <Btn disabled={!editForm.name.trim() || updateState.isLoading} onClick={submitEdit}>
                {updateState.isLoading ? "Saving…" : "Save"}
              </Btn>
              <Btn variant="plain" onClick={() => setEditing(null)}>Cancel</Btn>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <section aria-label="New product" className="h-fit rounded-xl border border-line bg-white shadow-card p-3">
          <h2 className="mb-3 text-sm font-semibold">New product</h2>
          <div className="space-y-3">
            <Field label="Name">
              <input id="nama-produk" className="w-full" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
            </Field>
            <Field label="Units per pack">
              <input id="isi-pack" type="number" min={1} className="w-full" value={productForm.units_per_pack} onChange={(e) => setProductForm({ ...productForm, units_per_pack: Number(e.target.value) })} />
            </Field>
            <Field label="Price per pack (Rp)">
              <MoneyInput id="harga-pack" value={productForm.purchase_price} onChange={(n) => setProductForm({ ...productForm, purchase_price: n })} />
            </Field>
            <Field label="Used for">
              <select id="tujuan-produk" className="w-full" value={productForm.purpose} onChange={(e) => setProductForm({ ...productForm, purpose: e.target.value })}>
                <option value="GENERAL">Both (shared)</option>
                <option value="DAILY">Daily open play</option>
                <option value="PERIOD">Period</option>
              </select>
            </Field>
            {productError && <p role="alert" className="text-sm text-red-700">{productError}</p>}
            <Btn disabled={!productForm.name.trim() || createState.isLoading} onClick={submitProduct}>
              {createState.isLoading ? "Saving…" : "Save product"}
            </Btn>
          </div>
        </section>

        <section aria-label="Buy tubes" className="h-fit rounded-xl border border-line bg-white shadow-card p-3">
          <h2 className="mb-3 text-sm font-semibold">Buy tubes</h2>
          <div className="space-y-3">
            <Field label="Product">
              <select id="produk-beli" className="w-full" value={buyForm.product_id} onChange={(e) => {
                const product_id = e.target.value;
                setBuyForm({
                  ...buyForm,
                  product_id,
                  pcs_total: buyMode === "pcs" ? autoTotal(product_id, buyForm.pcs) : buyForm.pcs_total,
                });
                setPcsAuto(true);
              }}>
                <option value="">- Select -</option>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
            <div className="flex gap-1" role="tablist" aria-label="Buy by packs or pieces">
              {(["packs", "pcs"] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={buyMode === m}
                  type="button"
                  onClick={() => {
                    setBuyMode(m);
                    if (m === "pcs") {
                      setBuyForm((f) => ({ ...f, pcs_total: autoTotal(f.product_id, f.pcs) }));
                      setPcsAuto(true);
                    }
                  }}
                  className={`flex-1 border px-2 py-1.5 text-sm ${buyMode === m ? "border-pine bg-pine text-paper" : "border-line bg-white hover:bg-court/60"}`}
                >
                  {m === "packs" ? "Packs" : "Pieces"}
                </button>
              ))}
            </div>
            {buyMode === "packs" ? (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Packs">
                  <input id="pack" type="number" min={1} className="w-full" value={buyForm.packs} onChange={(e) => setBuyForm({ ...buyForm, packs: Number(e.target.value) })} />
                </Field>
                <Field label="Price/pack (Rp)">
                  <MoneyInput id="harga-beli" value={buyForm.unit_price} onChange={(n) => setBuyForm({ ...buyForm, unit_price: n })} />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Pieces">
                  <input id="pcs" type="number" min={1} className="w-full" value={buyForm.pcs} onChange={(e) => {
                    const pcs = Math.max(0, Number(e.target.value) || 0);
                    setBuyForm({ ...buyForm, pcs, pcs_total: pcsAuto ? autoTotal(buyForm.product_id, pcs) : buyForm.pcs_total });
                  }} />
                </Field>
                <Field label="Total paid (Rp)" hint={buyForm.pcs > 0 ? `≈ ${rupiah(Math.round(buyForm.pcs_total / buyForm.pcs))}/pc${pcsAuto ? " (auto from pack price, editable)" : "."}` : undefined}>
                  <MoneyInput id="harga-pcs" value={buyForm.pcs_total} onChange={(n) => { setBuyForm({ ...buyForm, pcs_total: n }); setPcsAuto(false); }} />
                </Field>
              </div>
            )}
            <Field label="Note" hint="Optional.">
              <input id="catatan-beli" className="w-full" value={buyForm.note} onChange={(e) => setBuyForm({ ...buyForm, note: e.target.value })} />
            </Field>
            {buyError && <p role="alert" className="text-sm text-red-700">{buyError}</p>}
            <Btn disabled={!buyForm.product_id || (buyMode === "packs" ? buyForm.packs < 1 : buyForm.pcs < 1) || purchaseState.isLoading} onClick={submitPurchase}>
              {purchaseState.isLoading ? "Recording…" : "Record purchase"}
            </Btn>
          </div>
        </section>

        <section aria-label="Stock correction" className="h-fit rounded-xl border border-line bg-white shadow-card p-3">
          <h2 className="mb-3 text-sm font-semibold">Correct stock</h2>
          <div className="space-y-3">
            <Field label="Product" hint={adjForm.product_id ? `System stock: ${adjStock} pcs.` : undefined}>
              <select id="produk-koreksi" className="w-full" value={adjForm.product_id} onChange={(e) => { setAdjForm({ ...adjForm, product_id: e.target.value }); setCounted(""); }}>
                <option value="">- Select -</option>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.stock})</option>
                ))}
              </select>
            </Field>
            <Field label="Counted (pcs)" hint="Physical count. Difference is calculated automatically.">
              <input
                id="hitung-fisik"
                type="number"
                min={0}
                className="w-full"
                placeholder="e.g. 8"
                value={counted}
                onChange={(e) => {
                  const v = e.target.value;
                  setCounted(v);
                  if (v !== "" && adjForm.product_id) {
                    setAdjForm({ ...adjForm, units: Math.trunc(Number(v) || 0) - adjStock });
                  }
                }}
              />
            </Field>
            <Field label="Difference (negative = broken/lost)" hint={`Example: -2 for 2 broken shuttles. Auto-filled from counted above, editable.${adjForm.product_id ? ` Result: ${adjStock} → ${adjStock + adjForm.units} pcs.` : ""}`}>
              <div className="flex gap-1">
                <button type="button" aria-label="Decrease by 1" onClick={() => { setAdjForm({ ...adjForm, units: adjForm.units - 1 }); setCounted(""); }} className="border border-line bg-white px-3 text-lg leading-none hover:bg-court/60">−</button>
                <input id="selisih" type="number" className="w-full" value={adjForm.units} onChange={(e) => { setAdjForm({ ...adjForm, units: Number(e.target.value) }); setCounted(""); }} />
                <button type="button" aria-label="Increase by 1" onClick={() => { setAdjForm({ ...adjForm, units: adjForm.units + 1 }); setCounted(""); }} className="border border-line bg-white px-3 text-lg leading-none hover:bg-court/60">+</button>
              </div>
            </Field>
            <Field label="Reason">
              <input id="alasan" className="w-full" value={adjForm.note} onChange={(e) => setAdjForm({ ...adjForm, note: e.target.value })} />
            </Field>
            {adjError && <p role="alert" className="text-sm text-red-700">{adjError}</p>}
            <Btn disabled={!adjForm.product_id || adjForm.units === 0 || adjustState.isLoading} onClick={submitAdjust}>
              {adjustState.isLoading ? "Recording…" : "Record correction"}
            </Btn>
          </div>
        </section>
      </div>

      <section aria-label="Transaction history" className="mt-5 rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-sm font-semibold">Transaction history</h2>
        {tx.isFetching && !tx.data ? (
          <Loading />
        ) : (tx.data ?? []).length === 0 ? (
          <div className="p-3"><Empty text="No transactions yet." /></div>
        ) : (
          <table className="data">
            <thead>
              <tr><th>Date</th><th>Product</th><th>Type</th><th className="text-right">Units</th><th>Note</th></tr>
            </thead>
            <tbody>
              {(tx.data ?? []).map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap">{dateId(t.occurred_at)}</td>
                  <td>{t.product}</td>
                  <td><Badge status={t.type} /></td>
                  <td className="text-right tabular-nums">{t.units}</td>
                  <td>{t.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {pendingDelete && (
        <ConfirmModal
          title={forceArmed ? "Delete product and its transactions?" : "Delete this product?"}
          body={
            forceArmed ? (
              <>
                <p>
                  <strong>{pendingDelete.name}</strong> already has stock transactions. Deleting it will{" "}
                  <strong>permanently hard-delete the product and all its transactions</strong> (purchases,
                  usage, corrections). Cash expense records stay in the books.
                </p>
                <p className="mt-2">This cannot be undone. Are you sure?</p>
              </>
            ) : (
              <>
                <p>
                  Delete <strong>{pendingDelete.name}</strong> (stock {pendingDelete.stock} {pendingDelete.unit_name})?
                  This cannot be undone.
                </p>
              </>
            )
          }
          confirmLabel={forceArmed ? "Yes, delete everything" : "Yes, delete"}
          busy={removeState.isLoading}
          onConfirm={confirmDelete}
          onCancel={() => { setPendingDelete(null); setForceArmed(false); }}
        />
      )}
    </div>
  );
}
