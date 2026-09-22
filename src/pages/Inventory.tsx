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
import { useI18n } from "../i18n";

export function InventoryPage() {
  const { t, lang } = useI18n();
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
      setProductError(e instanceof ApiError ? e.message : t("inventory.errorSaveProduct"));
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
      setProductError(e instanceof ApiError ? e.message : t("inventory.errorSaveProduct"));
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
        setProductError(e instanceof ApiError ? e.message : t("inventory.errorDeleteProduct"));
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
      setBuyError(e instanceof ApiError ? e.message : t("inventory.errorRecordPurchase"));
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
      setAdjError(e instanceof ApiError ? e.message : t("inventory.errorRecordCorrection"));
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
    <div className="w-full min-w-0 space-y-5">
      <PageHead title={t("inventory.pageTitle")} sub={t("inventory.pageSubtitle")} />

      {deficit && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-2xs">
          <strong>{t("inventory.deficitAlertTitle", { name: deficit.name, stock: deficit.stock, unit: deficit.unit_name })}</strong>{" "}
          {t("inventory.deficitAlertDesc")}{" "}
          <button
            type="button"
            className="font-bold underline text-amber-950 hover:text-pine transition-colors inline-block mt-1 sm:mt-0"
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
            {t("inventory.btnFillBuyForm")} →
          </button>
        </div>
      )}

      {/* Current Stock Section */}
      <section aria-label="Stock" className="rounded-xl border border-line bg-white shadow-card min-w-0 w-full overflow-hidden">
        <h2 className="border-b border-line px-3.5 py-2.5 text-sm font-semibold text-ink">
          {t("inventory.currentStockTitle")}
        </h2>
        {products.isFetching && !products.data ? (
          <Loading />
        ) : products.isError ? (
          <div className="p-3"><ErrorBox message={t("inventory.errorLoadStock")} onRetry={() => products.refetch()} /></div>
        ) : list.length === 0 ? (
          <div className="p-3"><Empty text={t("inventory.emptyProducts")} /></div>
        ) : (
          <>
            {/* Mobile Card List (sm:hidden) - 100% width, zero horizontal scroll */}
            <div className="divide-y divide-line/70 sm:hidden">
              {list.map((p) => (
                <div key={p.id} className="p-3.5 space-y-3 transition-colors hover:bg-court/25">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-ink truncate">{p.name}</h3>
                    <Badge status={p.purpose ?? "GENERAL"} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-court/40 border border-line/60 p-2.5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block">
                        {t("inventory.colUnitsPack")} &amp; {t("inventory.colPackPrice")}
                      </span>
                      <div className="font-semibold text-ink tabular-nums">
                        {p.units_per_pack} {p.unit_name} · {rupiah(p.purchase_price)}
                      </div>
                    </div>

                    <div className="rounded-lg bg-court/40 border border-line/60 p-2.5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block">
                        {t("inventory.colStock")}
                      </span>
                      <div className={`font-bold text-sm tabular-nums ${p.stock < 0 ? "text-rose-700 font-extrabold" : "text-emerald-800"}`}>
                        {p.stock} {p.unit_name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink shadow-2xs hover:bg-court/60 active:scale-[0.99] transition-all"
                    >
                      ✎ {t("inventory.btnEdit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => askDelete(p)}
                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 shadow-2xs hover:border-red-300 hover:bg-red-50 active:scale-[0.99] transition-all"
                    >
                      🗑 {t("inventory.btnDelete")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop & Tablet Table (hidden sm:block) */}
            <div className="overflow-x-auto w-full hidden sm:block">
              <table className="data">
                <thead>
                  <tr>
                    <th>{t("inventory.colProduct")}</th>
                    <th>{t("inventory.colFor")}</th>
                    <th className="text-right">{t("inventory.colUnitsPack")}</th>
                    <th className="text-right">{t("inventory.colPackPrice")}</th>
                    <th className="text-right">{t("inventory.colStock")}</th>
                    <th className="text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium text-ink">{p.name}</td>
                      <td><Badge status={p.purpose ?? "GENERAL"} /></td>
                      <td className="text-right tabular-nums">{p.units_per_pack} {p.unit_name}</td>
                      <td className="text-right tabular-nums">{rupiah(p.purchase_price)}</td>
                      <td className={`text-right font-bold tabular-nums ${p.stock < 0 ? "text-rose-700" : "text-ink"}`}>
                        {p.stock} {p.unit_name}
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <span className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEdit(p)}
                            className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:bg-court/60 transition-colors shadow-2xs"
                          >
                            ✎ {t("inventory.btnEdit")}
                          </button>
                          <DeleteRowButton onClick={() => askDelete(p)} label={t("inventory.btnDelete")} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Edit Product Panel */}
      {editing && (
        <section aria-label="Edit product" className="rounded-xl border border-pine bg-white shadow-card p-4 min-w-0 w-full">
          <h2 className="mb-3.5 text-sm font-bold text-ink">
            {t("inventory.editProductTitle", { name: editing.name })}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-end">
            <Field label={t("inventory.fieldName")}>
              <input id="edit-nama-produk" className="w-full" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </Field>
            <Field label={t("inventory.fieldUnitsPack")}>
              <input id="edit-isi-pack" type="number" min={1} className="w-full" value={editForm.units_per_pack} onChange={(e) => setEditForm({ ...editForm, units_per_pack: Number(e.target.value) })} />
            </Field>
            <Field label={t("inventory.fieldPackPrice")}>
              <MoneyInput id="edit-harga-pack" value={editForm.purchase_price} onChange={(n) => setEditForm({ ...editForm, purchase_price: n })} />
            </Field>
            <Field label={t("inventory.fieldUsedFor")}>
              <select id="edit-tujuan-produk" className="w-full" value={editForm.purpose} onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}>
                <option value="GENERAL">{t("inventory.purposeGeneral")}</option>
                <option value="DAILY">{t("inventory.purposeDaily")}</option>
                <option value="PERIOD">{t("inventory.purposePeriod")}</option>
              </select>
            </Field>
            <Field label={t("inventory.fieldActive")}>
              <select id="edit-aktif" className="w-full" value={editForm.active ? "yes" : "no"} onChange={(e) => setEditForm({ ...editForm, active: e.target.value === "yes" })}>
                <option value="yes">{t("inventory.optActive")}</option>
                <option value="no">{t("inventory.optInactive")}</option>
              </select>
            </Field>
            <div className="flex items-center gap-2">
              <Btn className="flex-1 justify-center" disabled={!editForm.name.trim() || updateState.isLoading} onClick={submitEdit}>
                {updateState.isLoading ? t("inventory.btnSaving") : t("inventory.btnSave")}
              </Btn>
              <Btn variant="plain" onClick={() => setEditing(null)}>{t("inventory.btnCancel")}</Btn>
            </div>
          </div>
        </section>
      )}

      {/* Forms Grid: New product, Buy tubes, Correct stock */}
      <div className="grid gap-5 lg:grid-cols-3 min-w-0 w-full items-start">
        {/* New Product */}
        <section aria-label="New product" className="h-fit rounded-xl border border-line bg-white shadow-card p-4 min-w-0 w-full">
          <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-line/60">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-court text-pine">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-ink">{t("inventory.newProductTitle")}</h2>
          </div>

          <div className="space-y-3.5">
            <Field label={t("inventory.fieldName")}>
              <input id="nama-produk" className="w-full" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
            </Field>
            <Field label={t("inventory.fieldUnitsPack")}>
              <input id="isi-pack" type="number" min={1} className="w-full" value={productForm.units_per_pack} onChange={(e) => setProductForm({ ...productForm, units_per_pack: Number(e.target.value) })} />
            </Field>
            <Field label={t("inventory.fieldPackPrice")}>
              <MoneyInput id="harga-pack" value={productForm.purchase_price} onChange={(n) => setProductForm({ ...productForm, purchase_price: n })} />
            </Field>
            <Field label={t("inventory.fieldUsedFor")}>
              <select id="tujuan-produk" className="w-full" value={productForm.purpose} onChange={(e) => setProductForm({ ...productForm, purpose: e.target.value })}>
                <option value="GENERAL">{t("inventory.purposeGeneral")}</option>
                <option value="DAILY">{t("inventory.purposeDaily")}</option>
                <option value="PERIOD">{t("inventory.purposePeriod")}</option>
              </select>
            </Field>
            {productError && <p role="alert" className="text-sm text-red-700">{productError}</p>}
            <Btn className="w-full justify-center" disabled={!productForm.name.trim() || createState.isLoading} onClick={submitProduct}>
              {createState.isLoading ? t("inventory.btnSaving") : t("inventory.btnSaveProduct")}
            </Btn>
          </div>
        </section>

        {/* Buy Tubes */}
        <section aria-label="Buy tubes" className="h-fit rounded-xl border border-line bg-white shadow-card p-4 min-w-0 w-full">
          <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-line/60">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-court text-pine">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-ink">{t("inventory.buyTubesTitle")}</h2>
          </div>

          <div className="space-y-3.5">
            <Field label={t("inventory.fieldProduct")}>
              <select id="produk-beli" className="w-full" value={buyForm.product_id} onChange={(e) => {
                const product_id = e.target.value;
                setBuyForm({
                  ...buyForm,
                  product_id,
                  pcs_total: buyMode === "pcs" ? autoTotal(product_id, buyForm.pcs) : buyForm.pcs_total,
                });
                setPcsAuto(true);
              }}>
                <option value="">{t("inventory.selectProductPlaceholder")}</option>
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
                  className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${
                    buyMode === m ? "border-pine bg-pine text-paper shadow-2xs" : "border-line bg-white hover:bg-court/60 text-ink"
                  }`}
                >
                  {m === "packs" ? t("inventory.tabPacks") : t("inventory.tabPieces")}
                </button>
              ))}
            </div>
            {buyMode === "packs" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label={t("inventory.fieldPacks")}>
                  <input id="pack" type="number" min={1} className="w-full" value={buyForm.packs} onChange={(e) => setBuyForm({ ...buyForm, packs: Number(e.target.value) })} />
                </Field>
                <Field label={t("inventory.fieldPricePack")}>
                  <MoneyInput id="harga-beli" value={buyForm.unit_price} onChange={(n) => setBuyForm({ ...buyForm, unit_price: n })} />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label={t("inventory.fieldPieces")}>
                  <input id="pcs" type="number" min={1} className="w-full" value={buyForm.pcs} onChange={(e) => {
                    const pcs = Math.max(0, Number(e.target.value) || 0);
                    setBuyForm({ ...buyForm, pcs, pcs_total: pcsAuto ? autoTotal(buyForm.product_id, pcs) : buyForm.pcs_total });
                  }} />
                </Field>
                <Field label={t("inventory.fieldTotalPaid")} hint={buyForm.pcs > 0 ? `≈ ${rupiah(Math.round(buyForm.pcs_total / buyForm.pcs))}/pc${pcsAuto ? ` (${t("inventory.hintPricePerPieceAuto")})` : "."}` : undefined}>
                  <MoneyInput id="harga-pcs" value={buyForm.pcs_total} onChange={(n) => { setBuyForm({ ...buyForm, pcs_total: n }); setPcsAuto(false); }} />
                </Field>
              </div>
            )}
            <Field label={t("inventory.fieldNote")} hint={t("inventory.hintOptional")}>
              <input id="catatan-beli" className="w-full" value={buyForm.note} onChange={(e) => setBuyForm({ ...buyForm, note: e.target.value })} />
            </Field>
            {buyError && <p role="alert" className="text-sm text-red-700">{buyError}</p>}
            <Btn className="w-full justify-center" disabled={!buyForm.product_id || (buyMode === "packs" ? buyForm.packs < 1 : buyForm.pcs < 1) || purchaseState.isLoading} onClick={submitPurchase}>
              {purchaseState.isLoading ? t("inventory.btnRecordingPurchase") : t("inventory.btnRecordPurchase")}
            </Btn>
          </div>
        </section>

        {/* Stock Correction */}
        <section aria-label="Stock correction" className="h-fit rounded-xl border border-line bg-white shadow-card p-4 min-w-0 w-full">
          <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-line/60">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-court text-pine">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-ink">{t("inventory.correctStockTitle")}</h2>
          </div>

          <div className="space-y-3.5">
            <Field label={t("inventory.fieldProduct")} hint={adjForm.product_id ? t("inventory.hintSystemStock", { stock: adjStock }) : undefined}>
              <select id="produk-koreksi" className="w-full" value={adjForm.product_id} onChange={(e) => { setAdjForm({ ...adjForm, product_id: e.target.value }); setCounted(""); }}>
                <option value="">{t("inventory.selectProductPlaceholder")}</option>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.stock})</option>
                ))}
              </select>
            </Field>
            <Field label={t("inventory.fieldCounted")} hint={t("inventory.hintCounted")}>
              <input
                id="hitung-fisik"
                type="number"
                min={0}
                className="w-full"
                placeholder={t("inventory.placeholderCounted")}
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
            <Field label={t("inventory.fieldDifference")} hint={`${t("inventory.hintDifference")}${adjForm.product_id ? ` (Hasil: ${adjStock} → ${adjStock + adjForm.units} pcs)` : ""}`}>
              <div className="flex gap-1.5">
                <button type="button" aria-label="Decrease by 1" onClick={() => { setAdjForm({ ...adjForm, units: adjForm.units - 1 }); setCounted(""); }} className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-base font-bold hover:bg-court/60 shadow-2xs">−</button>
                <input id="selisih" type="number" className="w-full rounded-lg border border-line text-center font-bold" value={adjForm.units} onChange={(e) => { setAdjForm({ ...adjForm, units: Number(e.target.value) }); setCounted(""); }} />
                <button type="button" aria-label="Increase by 1" onClick={() => { setAdjForm({ ...adjForm, units: adjForm.units + 1 }); setCounted(""); }} className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-base font-bold hover:bg-court/60 shadow-2xs">+</button>
              </div>
            </Field>
            <Field label={t("inventory.fieldReason")}>
              <input id="alasan" className="w-full" value={adjForm.note} onChange={(e) => setAdjForm({ ...adjForm, note: e.target.value })} />
            </Field>
            {adjError && <p role="alert" className="text-sm text-red-700">{adjError}</p>}
            <Btn className="w-full justify-center" disabled={!adjForm.product_id || adjForm.units === 0 || adjustState.isLoading} onClick={submitAdjust}>
              {adjustState.isLoading ? t("inventory.btnRecordingCorrection") : t("inventory.btnRecordCorrection")}
            </Btn>
          </div>
        </section>
      </div>

      {/* Transaction History */}
      <section aria-label="Transaction history" className="rounded-xl border border-line bg-white shadow-card min-w-0 w-full overflow-hidden">
        <h2 className="border-b border-line px-3.5 py-2.5 text-sm font-semibold text-ink">
          {t("inventory.txHistoryTitle")}
        </h2>
        {tx.isFetching && !tx.data ? (
          <Loading />
        ) : (tx.data ?? []).length === 0 ? (
          <div className="p-3"><Empty text={t("inventory.emptyTransactions")} /></div>
        ) : (
          <>
            {/* Mobile Card List (sm:hidden) */}
            <div className="divide-y divide-line/70 sm:hidden">
              {(tx.data ?? []).map((tItem) => (
                <div key={tItem.id} className="p-3.5 space-y-2 transition-colors hover:bg-court/25">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink truncate">
                      {dateId(tItem.occurred_at, lang)}
                    </span>
                    <Badge status={tItem.type} />
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-ink truncate">{tItem.product}</span>
                    <span className={`font-bold tabular-nums text-sm ${tItem.units > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {tItem.units > 0 ? `+${tItem.units}` : tItem.units} pcs
                    </span>
                  </div>

                  {tItem.note && (
                    <p className="text-[11px] text-ink-soft bg-court/40 border border-line/60 rounded-md px-2 py-1">
                      {tItem.note}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop & Tablet Table (hidden sm:block) */}
            <div className="overflow-x-auto w-full hidden sm:block">
              <table className="data">
                <thead>
                  <tr>
                    <th>{t("inventory.colDate")}</th>
                    <th>{t("inventory.colProductTx")}</th>
                    <th>{t("inventory.colType")}</th>
                    <th className="text-right">{t("inventory.colUnits")}</th>
                    <th>{t("inventory.colNote")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(tx.data ?? []).map((tItem) => (
                    <tr key={tItem.id}>
                      <td className="whitespace-nowrap font-medium text-ink">{dateId(tItem.occurred_at, lang)}</td>
                      <td>{tItem.product}</td>
                      <td><Badge status={tItem.type} /></td>
                      <td className={`text-right font-bold tabular-nums ${tItem.units > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {tItem.units > 0 ? `+${tItem.units}` : tItem.units}
                      </td>
                      <td className="font-normal text-ink-soft">{tItem.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {pendingDelete && (
        <ConfirmModal
          title={forceArmed ? t("inventory.deleteModalForceTitle") : t("inventory.deleteModalTitle")}
          body={
            forceArmed ? (
              <>
                <p>
                  {t("inventory.deleteModalForceBody", { name: pendingDelete.name })}
                </p>
              </>
            ) : (
              <>
                <p>
                  {t("inventory.deleteModalBody", { name: pendingDelete.name, stock: pendingDelete.stock, unit: pendingDelete.unit_name })}
                </p>
              </>
            )
          }
          confirmLabel={forceArmed ? t("inventory.btnConfirmDeleteAll") : t("inventory.btnConfirmDelete")}
          busy={removeState.isLoading}
          onConfirm={confirmDelete}
          onCancel={() => { setPendingDelete(null); setForceArmed(false); }}
        />
      )}
    </div>
  );
}
