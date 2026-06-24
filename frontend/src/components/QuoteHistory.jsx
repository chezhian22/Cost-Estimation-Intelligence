import React, {
	useEffect,
	useState,
	useMemo,
	useRef,
	useCallback,
} from "react";
import { createPortal } from "react-dom";
import { api } from "../api";
import CylinderTable from "./CylinderTable";
import PricingPanel from "./PricingPanel";
import { toast } from "../utils/toast";
import { generateQuotationPDF } from "../utils/generatePDF";

const fmt = (v, d = 2) => (v != null ? Number(v).toFixed(d) : "—");

function buildRef(clientName, orderName, num) {
	const c = (clientName || "XX").replace(/\s+/g, "").slice(0, 2).toUpperCase();
	const o = (orderName || "ORD").replace(/\s+/g, "").slice(0, 3).toUpperCase();
	return `${c}??-${o}001-Q${num}`;
}

function fmtDateTime(dt) {
	if (!dt) return "—";
	return new Date(dt).toLocaleString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// ── Calculation Detail Modal ──────────────────────────────────────────────────
function CalcDetailModal({ calcId, onClose }) {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(null);

	useEffect(() => {
		setLoading(true);
		setLoadError(null);
		api
			.getCalculation(calcId)
			.then(setData)
			.catch((e) => setLoadError(e.message || "Failed to load calculation"))
			.finally(() => setLoading(false));
	}, [calcId]);

	const statusCfg = {
		confirmed: { label: "Approved", cls: "cop-status-confirmed" },
		pending: { label: "Draft", cls: "cop-status-pending" },
		rejected: { label: "Rejected", cls: "cop-status-rejected" },
	};
	const cfg = statusCfg[data?.status] ?? statusCfg.pending;

	return createPortal(
		<div className="cop-detail-overlay" onClick={onClose}>
			<div className="cop-detail-modal" onClick={(e) => e.stopPropagation()}>
				<div className="cop-detail-header">
					<button className="cop-detail-close" onClick={onClose}>
						← Close
					</button>
					<span className="cop-detail-title">Calculation Detail</span>
					{data && (
						<span className={`cop-status-badge ${cfg.cls}`}>
							<span className="cop-status-dot" /> {cfg.label}
						</span>
					)}
				</div>

				{loading && (
					<div className="history-state" style={{ padding: "3rem" }}>
						<div className="history-spinner" />
						<span>Loading calculation…</span>
					</div>
				)}

				{!loading && loadError && (
					<div className="error-banner" style={{ margin: "2rem 1.5rem" }}>
						⚠ {loadError}
					</div>
				)}

				{!loading && data && (
					<>
						<div className="cop-detail-meta-strip">
							<span className="cop-detail-meta-item">
								<span className="cop-detail-meta-label">Client:</span>
								<span className="cop-detail-meta-val">
									{data.client_name || "—"}
								</span>
							</span>
							<span className="cop-detail-meta-item">
								<span className="cop-detail-meta-label">Order:</span>
								<span className="cop-detail-meta-val">
									{data.order_name || "—"}
								</span>
							</span>
							<span className="cop-detail-meta-item">
								<span className="cop-detail-meta-label">Size:</span>
								<span className="cop-detail-meta-val">
									{fmt(data.width, 1)} × {fmt(data.height, 1)} mm
								</span>
							</span>
							<span className="cop-detail-meta-item">
								<span className="cop-detail-meta-label">Substrate:</span>
								<span className="cop-detail-meta-val">
									{data.substrate_name || "Custom"} · ₹
									{fmt(data.substrate_price)}/m²
								</span>
							</span>
							<span className="cop-detail-meta-item">
								<span className="cop-detail-meta-label">Yield:</span>
								<span className="cop-detail-meta-val">{data.yield_pct}%</span>
							</span>
							{data.foil_cost > 0 && (
								<span className="cop-detail-meta-item">
									<span className="cop-detail-meta-label">Foil:</span>
									<span className="cop-detail-meta-val">
										₹{fmt(data.foil_cost)}/m²
									</span>
								</span>
							)}
							<span className="cop-detail-meta-item">
								<span className="cop-detail-meta-label">Rate:</span>
								<span className="cop-detail-meta-val">
									₹{fmt(data.exchange_rate, 0)} / $
								</span>
							</span>
							{data.order_qty != null && (
								<span className="cop-detail-meta-item">
									<span className="cop-detail-meta-label">Qty:</span>
									<span className="cop-detail-meta-val">
										{Number(data.order_qty).toLocaleString()} labels
									</span>
								</span>
							)}
							<span className="cop-detail-meta-item">
								<span className="cop-detail-meta-label">Saved:</span>
								<span className="cop-detail-meta-val">
									{fmtDateTime(data.created_at)}
								</span>
							</span>
						</div>

						<div className="cop-detail-body">
							{data.result && (
								<>
									<CylinderTable
										result={data.result}
										orderQty={data.order_qty ? String(data.order_qty) : ""}
										pressSpeed={0}
									/>
									<PricingPanel
										result={data.result}
										orderQty={data.order_qty ? String(data.order_qty) : ""}
									/>
								</>
							)}
						</div>
					</>
				)}
			</div>
		</div>,
		document.body,
	);
}

function UserChip({ name }) {
	return (
		<span
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: "0.3rem",
				fontSize: "0.75rem",
				fontWeight: 600,
				color: "var(--teal)",
				whiteSpace: "nowrap",
			}}
		>
			<span
				style={{
					width: 18,
					height: 18,
					borderRadius: "50%",
					flexShrink: 0,
					background: "rgba(54,229,194,0.15)",
					border: "1px solid rgba(54,229,194,0.35)",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: "0.6rem",
					fontWeight: 800,
					color: "var(--teal)",
				}}
			>
				{name[0].toUpperCase()}
			</span>
			{name}
		</span>
	);
}

// ── Version Detail Modal ──────────────────────────────────────────────────────
function VersionDetailModal({ version, onClose, clientName, orderName }) {
	const [quotationLoading, setQuotationLoading] = useState(false);

	const statusCfg = {
		confirmed: { label: "Confirmed", cls: "cop-status-confirmed" },
		pending: { label: "Draft", cls: "cop-status-pending" },
		rejected: { label: "Rejected", cls: "cop-status-rejected" },
	};
	const cfg = statusCfg[version.status] ?? statusCfg.pending;

	async function handleQuotationPDF() {
		setQuotationLoading(true);
		try {
			let cs = {};
			try {
				cs = await api.getPublicSettings();
			} catch (_) {}
			generateQuotationPDF(
				{
					client: {
						name: clientName || "N/A",
						location: "",
						email: "",
						phone: "",
					},
					order: {
						label: orderName || "",
						ref: version.ref_code || `V${version.version_number}`,
					},
					inputs: {
						label_width_mm: version.width,
						label_height_mm: version.height,
						yield_pct: version.yield_pct || 85,
						substrate_name: version.substrate_name || "Custom",
						substrate_price: version.substrate_price || 0,
						foil_cost: version.foil_cost || 0,
						custom_cost: version.custom_cost ?? 0,
						exchange_rate: version.exchange_rate || 85,
						order_qty: 0,
					},
					result: version.result || {},
					preparedBy: version.created_by_name || "",
				},
				cs,
			);
		} catch (err) {
			toast.error(err.message || "PDF generation failed");
		} finally {
			setQuotationLoading(false);
		}
	}

	return createPortal(
		<div className="cop-detail-overlay" onClick={onClose}>
			<div className="cop-detail-modal" onClick={(e) => e.stopPropagation()}>
				<div className="cop-detail-header">
					<button className="cop-detail-close" onClick={onClose}>
						← Close
					</button>
					<span className="cop-detail-title">
						{version.ref_code || `V${version.version_number}`}
					</span>
					<span className={`cop-status-badge ${cfg.cls}`}>
						<span className="cop-status-dot" /> {cfg.label}
					</span>
				</div>
				<div className="cop-detail-meta-strip">
					<span className="cop-detail-meta-item">
						<span className="cop-detail-meta-label">Size:</span>
						<span className="cop-detail-meta-val">
							{fmt(version.width, 1)} × {fmt(version.height, 1)} mm
						</span>
					</span>
					<span className="cop-detail-meta-item">
						<span className="cop-detail-meta-label">Substrate:</span>
						<span className="cop-detail-meta-val">
							{version.substrate_name || "Custom"} · ₹
							{fmt(version.substrate_price)}/m²
						</span>
					</span>
					<span className="cop-detail-meta-item">
						<span className="cop-detail-meta-label">Yield:</span>
						<span className="cop-detail-meta-val">{version.yield_pct}%</span>
					</span>
					{version.foil_cost > 0 && (
						<span className="cop-detail-meta-item">
							<span className="cop-detail-meta-label">Foil:</span>
							<span className="cop-detail-meta-val">
								₹{fmt(version.foil_cost)}/m²
							</span>
						</span>
					)}
					<span className="cop-detail-meta-item">
						<span className="cop-detail-meta-label">Rate:</span>
						<span className="cop-detail-meta-val">
							₹{fmt(version.exchange_rate, 0)} / $
						</span>
					</span>
					{version.order_qty != null && (
						<span className="cop-detail-meta-item">
							<span className="cop-detail-meta-label">Qty:</span>
							<span className="cop-detail-meta-val">
								{Number(version.order_qty).toLocaleString()} labels
							</span>
						</span>
					)}
					{version.created_by_name && (
						<span className="cop-detail-meta-item">
							<span className="cop-detail-meta-label">By:</span>
							<span className="cop-detail-meta-val">
								<UserChip name={version.created_by_name} />
							</span>
						</span>
					)}
					<span className="cop-detail-meta-item">
						<span className="cop-detail-meta-label">Saved:</span>
						<span className="cop-detail-meta-val">
							{fmtDateTime(version.created_at)}
						</span>
					</span>
				</div>
				<div className="cop-detail-body">
					{version.result && (
						<>
							<CylinderTable
								result={version.result}
								orderQty={version.order_qty ? String(version.order_qty) : ""}
								pressSpeed={0}
							/>
							<PricingPanel
								result={version.result}
								orderQty={version.order_qty ? String(version.order_qty) : ""}
							/>
						</>
					)}
				</div>
				<div className="cop-detail-footer">
					<span />
					<button
						className="cop-pdf-btn"
						onClick={handleQuotationPDF}
						disabled={quotationLoading}
					>
						{quotationLoading ?
							<span
								className="cop-spinner"
								style={{ width: 11, height: 11, borderWidth: 2 }}
							/>
						:	<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
								<polyline points="14 2 14 8 20 8" />
								<line x1="16" y1="13" x2="8" y2="13" />
								<line x1="16" y1="17" x2="8" y2="17" />
							</svg>
						}
						{quotationLoading ? "Generating…" : "Quotation"}
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}

// ── Versions section — tree layout ───────────────────────────────────────────
function VersionsSection({
	calcId,
	parentCalc,
	onStatusChange,
	refreshAt,
	onEditVersion,
	clientName,
	orderName,
	refCode,
	selectMode,
	selectedItems,
	onToggleSelect,
	lockedClientId,
	lockedOrderId,
}) {
	const [versions, setVersions] = useState(null);
	const [loading, setLoading] = useState(true);
	const [detailVersion, setDetailVersion] = useState(null);
	const [pdfLoadingIds, setPdfLoadingIds] = useState(new Set());

	async function handleVersionQuotationPDF(e, v) {
		e.stopPropagation();
		setPdfLoadingIds((prev) => new Set(prev).add(v.id));
		try {
			let cs = {};
			try {
				cs = await api.getPublicSettings();
			} catch (_) {}
			generateQuotationPDF(
				{
					client: {
						name: clientName || "N/A",
						location: "",
						email: "",
						phone: "",
					},
					order: {
						label: orderName || "",
						ref: v.ref_code || `V${v.version_number}`,
					},
					inputs: {
						label_width_mm: v.width,
						label_height_mm: v.height,
						yield_pct: v.yield_pct || 85,
						substrate_name: v.substrate_name || "Custom",
						substrate_price: v.substrate_price || 0,
						foil_cost: v.foil_cost || 0,
						custom_cost: v.custom_cost ?? 0,
						exchange_rate: v.exchange_rate || 85,
						order_qty: 0,
					},
					result: v.result || {},
					preparedBy: v.created_by_name || "",
				},
				cs,
			);
		} catch (err) {
			toast.error(err.message || "PDF generation failed");
		} finally {
			setPdfLoadingIds((prev) => {
				const s = new Set(prev);
				s.delete(v.id);
				return s;
			});
		}
	}

	useEffect(() => {
		setLoading(true);
		api
			.getVersions(calcId)
			.then(setVersions)
			.catch(() => setVersions([]))
			.finally(() => setLoading(false));
	}, [calcId]);

	useEffect(() => {
		if (refreshAt === null || refreshAt === undefined) return;
		api
			.getVersions(calcId)
			.then(setVersions)
			.catch(() => {});
	}, [refreshAt]);

	function handleStatusChange(versionId, next, remarks, apiResult) {
		let versionNumber;
		setVersions((prev) => {
			const updated = prev.map((v) =>
				v.id === versionId ?
					{
						...v,
						status: next,
						status_remarks: remarks ?? null,
						status_changed_by_name:
							apiResult?.status_changed_by_name ?? v.status_changed_by_name,
						status_changed_at:
							apiResult?.status_changed_at ?? v.status_changed_at,
					}
				: next === "confirmed" && v.status === "confirmed" ?
					{ ...v, status: "pending" }
				:	v,
			);
			versionNumber = updated.find((v) => v.id === versionId)?.version_number;
			return updated;
		});
		onStatusChange?.(next, versionNumber);
	}

	if (loading)
		return (
			<div className="qh-tree-loading">
				<span
					className="cop-spinner"
					style={{ width: 12, height: 12, borderWidth: 2 }}
				/>
				Loading versions…
			</div>
		);

	// Descending order: newest version first
	const sorted =
		versions ?
			[...versions].sort((a, b) => b.version_number - a.version_number)
		:	[];

	if (!sorted.length)
		return (
			<div className="qh-tree-empty">
				No edited versions yet. Click <strong>Edit</strong> to revise this
				quote.
			</div>
		);

	return (
		<>
			{/* ── Column header row ── */}
			<div className={`qh-v-header${selectMode ? " qh-v-header--select" : ""}`}>
				{selectMode && <div className="qh-v-header-cell"></div>}
				<div className="qh-v-header-cell"></div>
				<div className="qh-v-header-cell">Size (mm)</div>
				<div className="qh-v-header-cell">Yield%</div>
				<div className="qh-v-header-cell">Created by</div>
				<div className="qh-v-header-cell">Status</div>
				<div className="qh-v-header-cell">Remarks</div>
				<div className="qh-v-header-cell">Actions</div>
			</div>

			<div className="qh-tree-list">
				{sorted.map((v) => (
					<div key={v.id} className="qh-tree-node">
						{/* Horizontal arm + arrowhead connecting from trunk to card */}
						<div className="qh-tree-arm" />
						<div
							className={`qh-v-card${
								v.status === "confirmed" ? " qh-v-card--confirmed"
								: v.status === "rejected" ? " qh-v-card--rejected"
								: ""}${selectedItems?.has(`ver-${v.id}`) ? " qh-v-card--selected" : ""}${selectMode ? " qh-v-card--select" : ""
							}`}
						>
							{/* ── Checkbox (select mode) ── */}
							{selectMode && (
								<div
									className="qh-vc-cell"
									style={{ alignItems: "center", justifyContent: "center", cursor: "pointer", padding: "0 0.3rem" }}
									onClick={(e) => { e.stopPropagation(); onToggleSelect?.(`ver-${v.id}`, { ...v, client_id: parentCalc?.client_id, order_id: parentCalc?.order_id, client_name: parentCalc?.client_name, order_name: parentCalc?.order_name }) }}
								>
									<div className={`qh-row-checkbox${selectedItems?.has(`ver-${v.id}`) ? " qh-row-checkbox--checked" : ""}${!selectedItems?.has(`ver-${v.id}`) && (selectedItems?.size >= 4 || (lockedClientId !== null && (parentCalc?.client_id !== lockedClientId || parentCalc?.order_id !== lockedOrderId))) ? " qh-row-checkbox--disabled" : ""}`}>
										{selectedItems?.has(`ver-${v.id}`) && (
											<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--bg-page)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
												<polyline points="20 6 9 17 4 12"/>
											</svg>
										)}
									</div>
								</div>
							)}

							{/* ── Col 1: Reference ── */}
							<div className="qh-vc-cell" style={{ alignItems: "center" }}>
								<span
									className="qh-v-badge"
									style={{ letterSpacing: "0.03em" }}
								>
									{v.ref_code ||
										(refCode ?
											`${refCode}-V${v.version_number}`
										:	`V${v.version_number}`)}
								</span>
							</div>

							{/* ── Col 2: Size ── */}
							<div className="qh-vc-cell" style={{ alignItems: "center" }}>
								<span className="qh-v-size">
									{fmt(v.width, 1)} × {fmt(v.height, 1)}
								</span>
							</div>

							{/* ── Col 3: Yield% ── */}
							<div className="qh-vc-cell" style={{ alignItems: "center" }}>
								<span style={{ fontSize: "0.78rem", color: "var(--text)" }}>
									{v.yield_pct != null ? `${v.yield_pct}%` : "—"}
								</span>
							</div>

							{/* ── Col 4: Created by ── */}
							<div className="qh-vc-cell" style={{ alignItems: "center" }}>
								{v.created_by_name ?
									<UserChip name={v.created_by_name} />
								:	<span
										style={{ color: "var(--text-dim)", fontSize: "0.77rem" }}
									>
										—
									</span>
								}
								<span className="qh-v-date">
									{v.created_at ?
										new Date(v.created_at).toLocaleDateString("en-IN", {
											day: "2-digit",
											month: "short",
											year: "numeric",
										})
									:	"—"}
								</span>
							</div>

							{/* ── Col 5: Status + Audit ── */}
							<div
								className="qh-vc-cell"
								style={{ alignItems: "center" }}
								onClick={(e) => e.stopPropagation()}
							>
								<StatusBadge
									calcId={v.id}
									status={v.status}
									onSave={(next, remarks) =>
										api.updateVersionStatus(v.id, next, remarks)
									}
									onChoose={(id, next, remarks) =>
										handleStatusChange(id, next, remarks)
									}
								/>
								{v.status_changed_by_name && (
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											alignItems: "center",
											gap: "0.1rem",
											marginTop: "0.2rem",
										}}
									>
										<span
											style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}
										>
											by <UserChip name={v.status_changed_by_name} />
										</span>
										{v.status_changed_at && (
											<span
												style={{
													fontSize: "0.62rem",
													color: "var(--text-dim)",
													opacity: 0.7,
												}}
											>
												{new Date(v.status_changed_at).toLocaleDateString(
													"en-IN",
													{ day: "2-digit", month: "short", year: "numeric" },
												)}
											</span>
										)}
									</div>
								)}
							</div>

							{/* ── Col 6: Remarks ── */}
							<div
								className="qh-vc-cell"
								style={{
									alignItems: v.status_remarks ? "flex-start" : "center",
								}}
							>
								{v.status_remarks ?
									<span
										style={{
											fontSize: "0.72rem",
											color: "var(--text-muted)",
											fontStyle: "italic",
											lineHeight: 1.5,
										}}
										title={v.status_remarks}
									>
										"{v.status_remarks}"
									</span>
								:	<span
										style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}
									>
										—
									</span>
								}
							</div>

							{/* ── Col 7: Actions ── */}
							<div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "stretch", width: 72, margin: "0 auto" }}>
								{onEditVersion && parentCalc && (
									<button
										className="qh-action-btn qh-action-btn--edit"
										onClick={() => onEditVersion(v, parentCalc)}
										title={`Edit ${v.ref_code || `V${v.version_number}`} — creates next version`}
										style={{ justifyContent: "center" }}
									>
										<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
											<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
											<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
										</svg>
										Edit
									</button>
								)}
								<button
									className="qh-action-btn qh-action-btn--view"
									onClick={() => setDetailVersion(v)}
									title="View version details"
									style={{ justifyContent: "center" }}
								>
									<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
										<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
										<circle cx="12" cy="12" r="3" />
									</svg>
									View
								</button>
								<button
									className="qh-action-btn"
									onClick={(e) => handleVersionQuotationPDF(e, v)}
									disabled={pdfLoadingIds.has(v.id)}
									title="Download quotation PDF"
									style={{ justifyContent: "center" }}
								>
									{pdfLoadingIds.has(v.id) ?
										<span className="cop-spinner" style={{ width: 10, height: 10, borderWidth: 2 }} />
									:	<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
											<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
											<polyline points="14 2 14 8 20 8" />
											<line x1="16" y1="13" x2="8" y2="13" />
											<line x1="16" y1="17" x2="8" y2="17" />
										</svg>
									}
									Quotation
								</button>
							</div>
						</div>
					</div>
				))}
			</div>
			{detailVersion && (
				<VersionDetailModal
					version={detailVersion}
					onClose={() => setDetailVersion(null)}
					clientName={clientName}
					orderName={orderName}
				/>
			)}
		</>
	);
}

const STATUS_CONFIG = {
	pending: { label: "Pending", cls: "status-pending" },
	confirmed: { label: "Confirmed", cls: "status-confirmed" },
	rejected: { label: "Rejected", cls: "status-rejected" },
};

const SCM_LABELS = {
	pending: "Pending (Draft)",
	confirmed: "Approved",
	rejected: "Rejected",
};

const SCM_MESSAGES = {
	pending:
		"This will move the quote back to pending (draft) status. Any previous confirmation will be removed.",
	confirmed:
		"This will mark the quote as approved and confirmed. The client will be considered to have accepted this quote.",
	rejected:
		"This will mark the quote as rejected. Please provide a reason so it can be referenced later.",
};

function StatusChangeModal({ currentStatus, nextStatus, onConfirm, onCancel }) {
	const [remarks, setRemarks] = useState("");
	const [error, setError] = useState(null);
	const [saving, setSaving] = useState(false);
	const requiresRemarks = nextStatus === "rejected";

	async function handleConfirm() {
		if (requiresRemarks && !remarks.trim()) {
			setError("A reason is required when rejecting a quote.");
			return;
		}
		setSaving(true);
		try {
			await onConfirm(nextStatus, remarks.trim() || null);
		} catch (e) {
			setError(e.message || "Failed to update status");
			setSaving(false);
		}
	}

	const pillStyle = (s) => ({
		display: "inline-block",
		padding: "2px 10px",
		borderRadius: 20,
		fontSize: "0.72rem",
		fontWeight: 700,
		letterSpacing: "0.04em",
		background:
			s === "confirmed" ? "rgba(26,188,171,0.18)"
			: s === "rejected" ? "rgba(239,68,68,0.15)"
			: "rgba(100,116,139,0.18)",
		color:
			s === "confirmed" ? "var(--teal)"
			: s === "rejected" ? "#f87171"
			: "var(--text-muted)",
		border: `1px solid ${
			s === "confirmed" ? "rgba(26,188,171,0.4)"
			: s === "rejected" ? "rgba(239,68,68,0.3)"
			: "rgba(100,116,139,0.3)"
		}`,
	});

	return createPortal(
		<div className="scm-overlay" onClick={onCancel}>
			<div className="scm-modal" onClick={(e) => e.stopPropagation()}>
				<div className="scm-header">
					<span className="scm-title">Change Quote Status</span>
				</div>
				<div className="scm-body">
					<div className="scm-transition-row">
						<span style={pillStyle(currentStatus)}>
							{SCM_LABELS[currentStatus] ?? currentStatus}
						</span>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							style={{ color: "var(--text-dim)", flexShrink: 0 }}
						>
							<line x1="5" y1="12" x2="19" y2="12" />
							<polyline points="12 5 19 12 12 19" />
						</svg>
						<span style={pillStyle(nextStatus)}>
							{SCM_LABELS[nextStatus] ?? nextStatus}
						</span>
					</div>
					<p className="scm-message">{SCM_MESSAGES[nextStatus]}</p>
					<div className="scm-remarks-block">
						<label className="scm-remarks-label">
							Remarks
							{requiresRemarks ?
								<span className="scm-required"> *required</span>
							:	<span className="scm-optional"> (optional)</span>}
						</label>
						<textarea
							className="scm-textarea"
							value={remarks}
							onChange={(e) => {
								setRemarks(e.target.value);
								setError(null);
							}}
							placeholder={
								requiresRemarks ?
									"Enter reason for rejection…"
								:	"Add any notes (optional)…"
							}
							rows={3}
						/>
						{error && <p className="scm-error">{error}</p>}
					</div>
				</div>
				<div className="scm-footer">
					<button
						className="scm-btn-cancel"
						onClick={onCancel}
						disabled={saving}
					>
						Cancel
					</button>
					<button
						className={`scm-btn-confirm${
							nextStatus === "rejected" ? " scm-btn-reject"
							: nextStatus === "confirmed" ? " scm-btn-approve"
							: ""
						}`}
						onClick={handleConfirm}
						disabled={saving}
					>
						{saving ?
							"Saving…"
						:	`Confirm — ${SCM_LABELS[nextStatus] ?? nextStatus}`}
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}

function StatusBadge({ calcId, status, onChoose, onSave }) {
	const [saving, setSaving] = useState(false);
	const [dropdownPos, setDropdownPos] = useState(null);
	const [modalStatus, setModalStatus] = useState(null);
	const btnRef = useRef(null);

	function open(e) {
		e.stopPropagation();
		if (dropdownPos) {
			setDropdownPos(null);
			return;
		}
		const rect = btnRef.current.getBoundingClientRect();
		setDropdownPos({
			top: rect.bottom + 5,
			right: window.innerWidth - rect.right,
		});
	}

	useEffect(() => {
		if (!dropdownPos) return;
		const close = () => setDropdownPos(null);
		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, [dropdownPos]);

	function selectOption(e, next) {
		e.stopPropagation();
		setDropdownPos(null);
		if (next === status) return;
		setModalStatus(next);
	}

	async function handleModalConfirm(next, remarks) {
		setSaving(true);
		try {
			let result;
			if (onSave) {
				result = await onSave(next, remarks);
			} else {
				result = await api.updateQuoteStatus(calcId, next, remarks);
			}
			onChoose(calcId, next, remarks, result);
			setModalStatus(null);
		} catch (e) {
			setSaving(false);
			throw e;
		}
		setSaving(false);
	}

	const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

	const dropdown =
		dropdownPos &&
		createPortal(
			<div
				className="status-dropdown"
				style={{
					position: "fixed",
					top: dropdownPos.top,
					right: dropdownPos.right,
					zIndex: 9999,
				}}
				onMouseDown={(e) => e.stopPropagation()}
			>
				{Object.entries(STATUS_CONFIG).map(([key, c]) => (
					<button
						key={key}
						className={`status-option ${c.cls}${status === key ? " current" : ""}`}
						onClick={(e) => selectOption(e, key)}
					>
						{status === key && <span className="status-check">✓ </span>}
						{c.label}
					</button>
				))}
			</div>,
			document.body,
		);

	return (
		<div className="status-wrap">
			<button
				ref={btnRef}
				className={`status-badge ${cfg.cls}${saving ? " status-saving" : ""}`}
				onClick={open}
				disabled={saving}
				title="Click to change status"
			>
				{saving ? "…" : cfg.label}
				<span className="status-caret">▾</span>
			</button>
			{dropdown}
			{modalStatus && (
				<StatusChangeModal
					currentStatus={status}
					nextStatus={modalStatus}
					onConfirm={handleModalConfirm}
					onCancel={() => setModalStatus(null)}
				/>
			)}
		</div>
	);
}

export default function QuoteHistory({ onEditCalc, onEditVersion, onCompareQuotes }) {
	const [quotes, setQuotes] = useState(null);
	const [clients, setClients] = useState([]);
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [ordersLoading, setOrdersLoading] = useState(false);
	const [error, setError] = useState(null);
	const [selectedClient, setSelectedClient] = useState("");
	const [selectedOrder, setSelectedOrder] = useState("");
	const [detailCalcId, setDetailCalcId] = useState(null);
	const [expandedRows, setExpandedRows] = useState(new Set());
	const [versionsRefreshAt, setVersionsRefreshAt] = useState(null);
	const [pdfLoadingIds, setPdfLoadingIds] = useState(new Set());
	const [selectMode, setSelectMode]         = useState(false);
	const [selectedItems, setSelectedItems]   = useState(new Map()); // key → item data

	const loadData = useCallback(async (silent = false) => {
		if (!silent) setLoading(true);
		try {
			const [qs, cs] = await Promise.all([api.getHistory(), api.getClients()]);
			setQuotes(qs);
			setClients(cs);
		} catch (e) {
			if (!silent) setError(e.message);
		} finally {
			if (!silent) setLoading(false);
		}
	}, []);

	async function handleQuotationPDF(e, q) {
		e.stopPropagation();
		setPdfLoadingIds((prev) => new Set(prev).add(q.id));
		try {
			const data = await api.getCalculation(q.id);
			let cs = {};
			try {
				cs = await api.getPublicSettings();
			} catch (_) {}
			generateQuotationPDF(
				{
					client: {
						name: data.client_name || "N/A",
						location: data.client_location || "",
						email: data.client_email || "",
						phone: data.client_phone || "",
					},
					order: {
						order_id: `CALC-${data.id}`,
						label: data.order_name || "",
						ref:
							q.ref_code ||
							buildRef(q.client_name, q.order_name, historyNums[q.id] ?? 1),
					},
					inputs: {
						label_width_mm: data.width,
						label_height_mm: data.height,
						yield_pct: data.yield_pct || 85,
						substrate_name: data.substrate_name || "Custom",
						substrate_price: data.substrate_price || 0,
						foil_cost: data.foil_cost || 0,
						custom_cost: data.custom_cost ?? 0,
						exchange_rate: data.exchange_rate || 85,
						order_qty: data.order_qty || 0,
					},
					result: data.result || {},
					preparedBy: "",
				},
				cs,
			);
		} catch (err) {
			toast.error(err.message || "PDF generation failed");
		} finally {
			setPdfLoadingIds((prev) => {
				const s = new Set(prev);
				s.delete(q.id);
				return s;
			});
		}
	}

	function toggleExpand(id) {
		setExpandedRows((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	}

	useEffect(() => {
		loadData();
		const interval = setInterval(() => loadData(true), 5_000);
		const onVisible = () => {
			if (!document.hidden) loadData(true);
		};
		document.addEventListener("visibilitychange", onVisible);
		return () => {
			clearInterval(interval);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [loadData]);

	// When client changes, fetch its orders and reset order selection
	useEffect(() => {
		setSelectedOrder("");
		setOrders([]);
		if (!selectedClient) return;
		setOrdersLoading(true);
		api
			.getOrders(Number(selectedClient))
			.then(setOrders)
			.catch(() => setOrders([]))
			.finally(() => setOrdersLoading(false));
	}, [selectedClient]);

	const filtered = useMemo(() => {
		if (!quotes) return [];
		return quotes.filter((q) => {
			const matchClient =
				!selectedClient || q.client_id === Number(selectedClient);
			const matchOrder = !selectedOrder || q.order_id === Number(selectedOrder);
			return matchClient && matchOrder;
		});
	}, [quotes, selectedClient, selectedOrder]);

	// Sequential history number per order (sorted by id ascending = oldest = #1)
	const historyNums = useMemo(() => {
		if (!quotes) return {};
		const byOrder = {};
		quotes.forEach((q) => {
			const key = q.order_id != null ? q.order_id : `_${q.id}`;
			if (!byOrder[key]) byOrder[key] = [];
			byOrder[key].push(q);
		});
		const nums = {};
		Object.values(byOrder).forEach((group) => {
			group.sort((a, b) => a.id - b.id);
			group.forEach((q, i) => {
				nums[q.id] = i + 1;
			});
		});
		return nums;
	}, [quotes]);

	function handleStatusChange(calcId, next, remarks, apiResult) {
		setQuotes((prev) => {
			const orderId = prev.find((x) => x.id === calcId)?.order_id;
			return prev.map((q) => {
				if (q.id === calcId)
					return {
						...q,
						status: next,
						status_remarks: remarks ?? null,
						status_changed_by_name:
							apiResult?.status_changed_by_name ?? q.status_changed_by_name,
						status_changed_at:
							apiResult?.status_changed_at ?? q.status_changed_at,
					};
				if (next === "confirmed" && orderId && q.order_id === orderId)
					return { ...q, status: "pending" };
				return q;
			});
		});
		if (next === "confirmed") setVersionsRefreshAt(Date.now());
	}

	function handleVersionStatusChange(parentCalcId, next, versionNumber) {
		if (next !== "confirmed") return;
		setQuotes((prev) => {
			const orderId = prev.find((x) => x.id === parentCalcId)?.order_id;
			return prev.map((q) => {
				if (q.id === parentCalcId)
					return {
						...q,
						status: "pending",
						confirmed_version_number:
							versionNumber ?? q.confirmed_version_number,
					};
				if (orderId && q.order_id === orderId)
					return { ...q, status: "pending", confirmed_version_number: null };
				return q;
			});
		});
	}

	function clearFilters() {
		setSelectedClient("");
		setSelectedOrder("");
		setOrders([]);
	}

	function toggleSelectMode() {
		setSelectMode(v => !v);
		setSelectedItems(new Map());
	}

	function toggleSelectItem(key, data) {
		setSelectedItems(prev => {
			const next = new Map(prev);
			if (next.has(key)) { next.delete(key); return next; }
			if (next.size >= 4) return prev;
			if (next.size > 0) {
				const first = Array.from(next.values())[0];
				if (data.client_id !== first.client_id || data.order_id !== first.order_id) return prev;
			}
			next.set(key, data);
			return next;
		});
	}

	const _firstSel = selectedItems.size > 0 ? Array.from(selectedItems.values())[0] : null;
	const lockedClientId = _firstSel?.client_id ?? null;
	const lockedOrderId  = _firstSel?.order_id  ?? null;

	function handleCompare() {
		const selected = Array.from(selectedItems.values());
		onCompareQuotes?.(selected);
		setSelectMode(false);
		setSelectedItems(new Map());
	}

	const hasFilters = selectedClient || selectedOrder;

	return (
		<section className="card">
			<div className="card-header">
				<div className="card-icon-wrap">🕘</div>
				<span className="card-title">Quote Management</span>
				<span className="card-number">SYS-05</span>
			</div>

			{loading && (
				<div className="history-state">
					<div className="history-spinner" />
					<span>Loading history…</span>
				</div>
			)}

			{error && (
				<div
					className="history-state error-banner"
					style={{ margin: "1.4rem" }}
				>
					⚠ {error}
				</div>
			)}

			{!loading && !error && quotes?.length === 0 && (
				<div className="history-state">
					<span className="history-empty-icon">📋</span>
					<span>
						No quotes saved yet. Run a calculation with a client and order to
						save it.
					</span>
				</div>
			)}

			{!loading && !error && quotes?.length > 0 && (
				<>
					{/* ── Cascading filter bar ── */}
					<div className="qh-filter-bar">
						{/* Step 1 — Client */}
						<div className="qh-filter-group">
							<label className="qh-filter-label">① Client</label>
							<select
								className="qh-filter-select"
								value={selectedClient}
								onChange={(e) => setSelectedClient(e.target.value)}
							>
								<option value="">All clients</option>
								{clients.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</select>
						</div>

						{/* Step 2 — Order (only active after client is picked) */}
						<div className="qh-filter-group">
							<label
								className={`qh-filter-label${!selectedClient ? " qh-filter-label--dim" : ""}`}
							>
								② Order
							</label>
							<select
								className="qh-filter-select"
								value={selectedOrder}
								onChange={(e) => setSelectedOrder(e.target.value)}
								disabled={!selectedClient || ordersLoading}
							>
								<option value="">
									{!selectedClient ?
										"Select a client first"
									: ordersLoading ?
										"Loading…"
									:	"All orders"}
								</option>
								{orders.map((o) => (
									<option key={o.id} value={o.id}>
										{o.name}
									</option>
								))}
							</select>
						</div>

						{hasFilters && (
							<button className="qh-filter-clear" onClick={clearFilters}>
								✕ Clear
							</button>
						)}

						<span className="qh-filter-count">
							{filtered.length} / {quotes.length} quotes
						</span>
					</div>

					{/* ── Selection banner ── */}
					{selectMode && (
						<div className="qh-select-banner">
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
							</svg>
							<span>
								Expand a quote to also select its versions. Select 2–4 from the same client and order.
								{selectedItems.size > 0 && (
									<strong style={{ marginLeft: '0.5rem', color: 'var(--teal)' }}>
										{selectedItems.size} selected{selectedItems.size === 4 ? ' (max)' : ''}. Locked to: {_firstSel?.client_name} / {_firstSel?.order_name}.
									</strong>
								)}
							</span>
						</div>
					)}

				{/* ── Flat table ── */}
					<div className="table-wrapper">
						<table className="qh-table" style={{ tableLayout: "fixed" }}>
							<colgroup>
								{selectMode && <col style={{ width: 36 }} />}
								<col style={{ width: 145 }} />
								{/* Ref */}
								<col style={{ width: 88 }} />
								{/* Client */}
								<col style={{ width: 95 }} />
								{/* Order */}
								<col style={{ width: 88 }} />
								{/* Size */}
								<col style={{ width: 95 }} />
								{/* Created by */}
								<col style={{ width: 115 }} />
								{/* CP Status */}
								<col style={{ width: 82 }} />
								{/* Remarks */}
								<col style={{ width: 160 }} />
								{/* Actions */}
							</colgroup>
							<thead>
								<tr>
									{selectMode && <th style={{ width: 36 }}></th>}
									<th style={{ textAlign: "center" }}>Ref</th>
									<th style={{ textAlign: "center" }}>Client</th>
									<th style={{ textAlign: "center" }}>Order</th>
									<th style={{ textAlign: "center" }}>
										Size <span className="th-unit">mm</span>
									</th>
									<th style={{ textAlign: "center" }}>Created by</th>
									<th style={{ textAlign: "center" }}>CP Status</th>
									<th style={{ textAlign: "center" }}>Remarks</th>
									<th style={{ textAlign: "center", width: 80 }}>Actions</th>
								</tr>
							</thead>
							<tbody>
								{filtered.length === 0 ?
									<tr>
										<td
											colSpan={9}
											style={{
												textAlign: "center",
												padding: "2.5rem",
												color: "var(--text-muted)",
												fontFamily: "Inter, sans-serif",
												fontStyle: "italic",
											}}
										>
											No quotes match the selected filters.
										</td>
									</tr>
								:	filtered.flatMap((q, i) => {
										const isExpanded = expandedRows.has(q.id);
										const refCode =
											q.ref_code ||
											buildRef(
												q.client_name,
												q.order_name,
												historyNums[q.id] ?? 1,
											);
										return [
											<tr
												key={q.id ?? i}
												className={`qh-quote-row${isExpanded ? " qh-quote-row--expanded" : ""}${
													(
														q.status === "confirmed" ||
														q.confirmed_version_number != null
													) ?
														" qh-quote-row--confirmed"
													: q.status === "rejected" ? " qh-quote-row--rejected"
													: ""
												}${selectMode ? " qh-quote-row--selectable" : ""}${selectedItems.has(`calc-${q.id}`) ? " qh-quote-row--selected" : ""}`}
												style={{ cursor: "pointer" }}
												onClick={() => toggleExpand(q.id)}
											>
												{selectMode && (
													<td
														style={{ textAlign: "center", verticalAlign: "middle", padding: "0 0.4rem" }}
														onClick={(e) => { e.stopPropagation(); if (!selectedItems.has(`calc-${q.id}`) && lockedClientId !== null && (q.client_id !== lockedClientId || q.order_id !== lockedOrderId)) return; toggleSelectItem(`calc-${q.id}`, q) }}
													>
														<div className={`qh-row-checkbox${selectedItems.has(`calc-${q.id}`) ? " qh-row-checkbox--checked" : ""}${!selectedItems.has(`calc-${q.id}`) && (selectedItems.size >= 4 || (lockedClientId !== null && (q.client_id !== lockedClientId || q.order_id !== lockedOrderId))) ? " qh-row-checkbox--disabled" : ""}`}>
															{selectedItems.has(`calc-${q.id}`) && (
																<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--bg-page)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
																	<polyline points="20 6 9 17 4 12"/>
																</svg>
															)}
														</div>
													</td>
												)}
												<td
													style={{ textAlign: "center", whiteSpace: "nowrap" }}
												>
													<div
														style={{
															display: "inline-flex",
															alignItems: "center",
															gap: "0.25rem",
														}}
													>
														{!selectMode && (
															<svg
																className={`qh-row-chevron${isExpanded ? " qh-row-chevron--open" : ""}`}
																width="11"
																height="11"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth="2.5"
																strokeLinecap="round"
																strokeLinejoin="round"
															>
																<polyline points="6 9 12 15 18 9" />
															</svg>
														)}
														<span
															className="qh-v-badge"
															style={{ letterSpacing: "0.03em" }}
														>
															{refCode}
														</span>
														<span className="qh-v-badge">V0</span>
													</div>
												</td>
												<td style={{ textAlign: "center" }}>
													{q.client_name ?? (
														<span style={{ color: "var(--text-dim)" }}>—</span>
													)}
												</td>
												<td
													style={{
														textAlign: "center",
														color: "var(--text)",
														fontWeight: 500,
													}}
												>
													{q.order_name ?? (
														<span style={{ color: "var(--text-dim)" }}>—</span>
													)}
												</td>
												<td style={{ textAlign: "center" }}>
													{fmt(q.width, 1)} × {fmt(q.height, 1)}
												</td>
												<td style={{ textAlign: "center" }}>
													<div
														style={{
															display: "flex",
															flexDirection: "column",
															alignItems: "center",
															gap: "0.15rem",
														}}
													>
														{q.created_by_name ?
															<UserChip name={q.created_by_name} />
														:	<span style={{ color: "var(--text-muted)" }}>
																—
															</span>
														}
														{q.created_at && (
															<span
																style={{
																	fontSize: "0.62rem",
																	color: "var(--text-dim)",
																	opacity: 0.8,
																}}
															>
																{new Date(q.created_at).toLocaleDateString(
																	"en-IN",
																	{
																		day: "2-digit",
																		month: "short",
																		year: "numeric",
																	},
																)}
															</span>
														)}
													</div>
												</td>
												<td
													style={{ textAlign: "center" }}
													onClick={(e) => e.stopPropagation()}
												>
													<div
														style={{
															display: "flex",
															flexDirection: "column",
															alignItems: "center",
															gap: "0.2rem",
														}}
													>
														{/* Version indicator above the badge */}
														{q.confirmed_version_number != null ?
															<span
																style={{
																	display: "inline-flex",
																	alignItems: "center",
																	gap: "0.3rem",
																	fontSize: "0.68rem",
																	fontWeight: 700,
																	color: "var(--teal)",
																	background: "rgba(26,188,171,0.12)",
																	border: "1px solid rgba(26,188,171,0.38)",
																	borderRadius: 100,
																	padding: "2px 9px",
																	letterSpacing: "0.01em",
																	whiteSpace: "nowrap",
																}}
															>
																<svg
																	width="9"
																	height="9"
																	viewBox="0 0 24 24"
																	fill="none"
																	stroke="currentColor"
																	strokeWidth="3"
																	strokeLinecap="round"
																	strokeLinejoin="round"
																>
																	<polyline points="20 6 9 17 4 12" />
																</svg>
																V{q.confirmed_version_number} confirmed
															</span>
														:	<span
																style={{
																	fontSize: "0.66rem",
																	fontWeight: 600,
																	color: "var(--text-dim)",
																	background: "rgba(100,116,139,0.08)",
																	border: "1px solid rgba(100,116,139,0.20)",
																	borderRadius: 100,
																	padding: "2px 8px",
																	letterSpacing: "0.01em",
																}}
															>
																V0
															</span>
														}
														{/* V0 status badge — always visible */}
														<StatusBadge
															calcId={q.id}
															status={q.status}
															onChoose={handleStatusChange}
														/>
														{q.status_changed_by_name && (
															<span
																style={{
																	display: "flex",
																	flexDirection: "column",
																	gap: "0.1rem",
																	paddingLeft: 2,
																}}
															>
																<span
																	style={{
																		fontSize: "0.65rem",
																		color: "var(--text-dim)",
																	}}
																>
																	by{" "}
																	<UserChip name={q.status_changed_by_name} />
																</span>
																{q.status_changed_at && (
																	<span
																		style={{
																			fontSize: "0.62rem",
																			color: "var(--text-dim)",
																			opacity: 0.7,
																		}}
																	>
																		{new Date(
																			q.status_changed_at,
																		).toLocaleDateString("en-IN", {
																			day: "2-digit",
																			month: "short",
																			year: "numeric",
																		})}
																	</span>
																)}
															</span>
														)}
													</div>
												</td>
												<td
													style={{
														textAlign: q.status_remarks ? "left" : "center",
														maxWidth: 200,
														paddingRight: "1.5rem",
													}}
												>
													{q.status_remarks ?
														<span
															style={{
																fontSize: "0.73rem",
																color: "var(--text-muted)",
																fontStyle: "italic",
																lineHeight: 1.5,
																display: "-webkit-box",
																WebkitLineClamp: 3,
																WebkitBoxOrient: "vertical",
																overflow: "hidden",
															}}
															title={q.status_remarks}
														>
															"{q.status_remarks}"
														</span>
													:	<span
															style={{
																color: "var(--text-dim)",
																fontSize: "0.75rem",
															}}
														>
															—
														</span>
													}
												</td>
												<td
													onClick={(e) => e.stopPropagation()}
												>
													<div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "stretch", width: 72, margin: "0 auto" }}>
														{onEditCalc && (
															<button
																className="qh-action-btn qh-action-btn--edit"
																onClick={() => onEditCalc(q)}
																title="Edit this calculation"
																style={{ justifyContent: "center" }}
															>
																<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
																	<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
																	<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
																</svg>
																Edit
															</button>
														)}
														<button
															className="qh-action-btn qh-action-btn--view"
															onClick={() => setDetailCalcId(q.id)}
															title="View full details"
															style={{ justifyContent: "center" }}
														>
															<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
																<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
																<circle cx="12" cy="12" r="3" />
															</svg>
															View
														</button>
														<button
															className="qh-action-btn"
															onClick={(e) => handleQuotationPDF(e, q)}
															disabled={pdfLoadingIds.has(q.id)}
															title="Download quotation PDF"
															style={{ justifyContent: "center" }}
														>
															{pdfLoadingIds.has(q.id) ?
																<span className="cop-spinner" style={{ width: 10, height: 10, borderWidth: 2 }} />
															:	<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
																	<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
																	<polyline points="14 2 14 8 20 8" />
																	<line x1="16" y1="13" x2="8" y2="13" />
																	<line x1="16" y1="17" x2="8" y2="17" />
																</svg>
															}
															Quotation
														</button>
													</div>
												</td>
											</tr>,
											isExpanded && (
												<tr
													key={`versions-${q.id}`}
													className="qh-versions-expand-row"
												>
													<td colSpan={selectMode ? 9 : 8} style={{ padding: 0 }}>
														<div className="qh-versions-container">
															<div className="qh-versions-header">
																<svg
																	width="12"
																	height="12"
																	viewBox="0 0 24 24"
																	fill="none"
																	stroke="currentColor"
																	strokeWidth="2"
																	strokeLinecap="round"
																	strokeLinejoin="round"
																>
																	<line x1="6" y1="3" x2="6" y2="15" />
																	<circle cx="18" cy="6" r="3" />
																	<circle cx="6" cy="18" r="3" />
																	<path d="M18 9a9 9 0 0 1-9 9" />
																</svg>
																All versions
															</div>
															<VersionsSection
																calcId={q.id}
																parentCalc={q}
																refCode={refCode}
																onStatusChange={(next, versionNumber) =>
																	handleVersionStatusChange(
																		q.id,
																		next,
																		versionNumber,
																	)
																}
																refreshAt={versionsRefreshAt}
																onEditVersion={onEditVersion}
																clientName={q.client_name}
																orderName={q.order_name}
					selectMode={selectMode}
					selectedItems={selectedItems}
					onToggleSelect={toggleSelectItem}
					lockedClientId={lockedClientId}
					lockedOrderId={lockedOrderId}
															/>
														</div>
													</td>
												</tr>
											),
										].filter(Boolean);
									})
								}
							</tbody>
						</table>
					</div>
				</>
			)}

			{detailCalcId && (
				<CalcDetailModal
					calcId={detailCalcId}
					onClose={() => setDetailCalcId(null)}
				/>
			)}

			{/* ── Compare FAB ── */}
			{createPortal(
				<>
					{/* Bottom-left in select mode, bottom-right when idle */}
					<div className={`qh-compare-fab-wrap${selectMode ? " qh-compare-fab-wrap--left" : " qh-compare-fab-wrap--right"}`} style={!selectMode ? { right: 'calc(3rem + 100px)' } : { left: 'calc(3rem + 300px)' }}>
						{selectMode ? (
							<button
								className={`qh-compare-fab${selectedItems.size >= 2 ? " qh-compare-fab--ready" : ""}`}
								onClick={selectedItems.size >= 2 ? handleCompare : undefined}
								disabled={selectedItems.size < 2}
								title={selectedItems.size < 2 ? "Select at least 2 quotes" : `Compare ${selectedItems.size} quotes`}
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
									<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
								</svg>
								{selectedItems.size >= 2 ? `Compare ${selectedItems.size} Quotes` : "Select 2–4 Quotes"}
							</button>
						) : (
							<button className="qh-compare-fab" onClick={toggleSelectMode} title="Compare quotes side by side">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
									<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
								</svg>
								Compare Quotes
							</button>
						)}
					</div>

					{/* Bottom-right: Cancel only in select mode */}
					{selectMode && (
						<div className="qh-compare-fab-wrap qh-compare-fab-wrap--right">
							<button className="qh-compare-fab-cancel" onClick={toggleSelectMode}>
								✕ Cancel
							</button>
						</div>
					)}
				</>,
				document.body
			)}
		</section>
	);
}
