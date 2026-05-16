"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, FileDown, Printer, Trash2 } from "lucide-react";
import Link from "next/link";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function formatDateBR(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${parseInt(day)} de ${MONTHS[parseInt(month) - 1]} de ${year}`;
}

function formatCpf(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatRg(value: string) {
  return value.replace(/[^\d./-]/g, "").slice(0, 14);
}

type AuthData = {
  authorized: { name: string; rg: string; cpf: string };
  objectNumber: string;
  senderName: string;
  city: string;
  date: string;
  owner: { name: string; rg: string; cpf: string };
};

const initialAuth: AuthData = {
  authorized: { name: "", rg: "", cpf: "" },
  objectNumber: "",
  senderName: "",
  city: "",
  date: "",
  owner: { name: "", rg: "", cpf: "" },
};

const STORAGE_KEY = "autorizacao-data";

function loadFromStorage(): AuthData {
  if (typeof window === "undefined") return initialAuth;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialAuth;
    const parsed = JSON.parse(raw);
    return {
      authorized: { ...initialAuth.authorized, ...parsed.authorized },
      objectNumber: parsed.objectNumber ?? "",
      senderName: parsed.senderName ?? "",
      city: parsed.city ?? "",
      date: parsed.date ?? "",
      owner: { ...initialAuth.owner, ...parsed.owner },
    };
  } catch {
    return initialAuth;
  }
}

function isValid(data: AuthData): boolean {
  return Boolean(
    data.authorized.name &&
    data.authorized.rg &&
    data.authorized.cpf &&
    data.objectNumber &&
    data.senderName &&
    data.city &&
    data.date &&
    data.owner.name &&
    data.owner.rg &&
    data.owner.cpf,
  );
}

function FormField({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`field${wide ? " wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function PrintableAuth({ data }: { data: AuthData }) {
  const [showSignature, setShowSignature] = useState(true);

  return (
    <div className="print-page">
      <div className="print-blank-half" />
      <div className="print-label-half" style={{ padding: "56px 52px 48px" }}>
        <h1 className="auth-title">AUTORIZAÇÃO</h1>

        <p className="auth-body">
          Autorizo <strong>{data.authorized.name.toUpperCase()}</strong>, RG nº{" "}
          <strong>{data.authorized.rg}</strong>, CPF nº{" "}
          <strong>{data.authorized.cpf}</strong>, retirar o objeto nº{" "}
          <strong>{data.objectNumber}</strong> postado por{" "}
          <strong>{data.senderName}</strong> e a mim destinado.
        </p>

        <p className="auth-date">
          {data.city}, {formatDateBR(data.date)} .
        </p>

        <div style={{ position: "relative", paddingTop: 72, marginBottom: 20 }}>
          {showSignature && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/assinatura.png"
              alt=""
              onError={() => setShowSignature(false)}
              style={{
                position: "absolute",
                bottom: -20,
                left: 60,
                height: 50,
                width: "auto",
                objectFit: "contain",
              }}
            />
          )}
          <div className="auth-signature-line" style={{ margin: 0 }} />
        </div>

        <div className="auth-owner">
          <p>
            <strong>Nome:</strong> {data.owner.name.toUpperCase()}
          </p>
          <p>
            <strong>RG:</strong> {data.owner.rg}
          </p>
          <p>
            <strong>CPF:</strong> {data.owner.cpf}
          </p>
        </div>
      </div>
    </div>
  );
}

async function printPage(selector: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  const element = document.querySelector(selector) as HTMLElement | null;
  if (!element) { win.close(); return; }
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });
  const imgData = canvas.toDataURL("image/png");
  win.document.write(
    `<!DOCTYPE html><html><head><style>` +
    `@page{size:A4 landscape;margin:0}` +
    `*{margin:0;padding:0}` +
    `img{width:100%;height:auto;display:block}` +
    `</style></head><body>` +
    `<img src="${imgData}">` +
    `<script>window.onload=function(){window.print();window.close()}<\/script>` +
    `</body></html>`,
  );
  win.document.close();
}

async function downloadPdf(selector: string, filename: string) {
  const element = document.querySelector(selector) as HTMLElement | null;
  if (!element) return;
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const canvasRatio = canvas.height / canvas.width;
  let imgW = pageWidth;
  let imgH = pageWidth * canvasRatio;
  if (imgH > pageHeight) {
    imgH = pageHeight;
    imgW = pageHeight / canvasRatio;
  }
  pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
  pdf.save(filename);
}

export default function AutorizacaoPage() {
  const [data, setData] = useState<AuthData>(initialAuth);
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<"form" | "print">("form");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  useEffect(() => {
    setData(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data, hydrated]);

  const handleClear = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setData({
      ...initialAuth,
      authorized: { ...initialAuth.authorized },
      owner: { ...initialAuth.owner },
    });
    setStep("form");
  };

  const set = (field: keyof AuthData, value: string) =>
    setData((current) => ({ ...current, [field]: value }));

  const setNested =
    (section: "authorized" | "owner") => (field: string, value: string) =>
      setData((current) => ({
        ...current,
        [section]: { ...current[section], [field]: value },
      }));

  const handlePrint = async () => {
    setPrintLoading(true);
    try {
      await printPage(".print-page");
    } finally {
      setPrintLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadPdf(".print-page", "autorizacao.pdf");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isValid(data)) setStep("print");
  };

  const valid = isValid(data);

  return (
    <main className="auth-shell">
      <header className="page-header">
        <div className="header-inner">
          <div>
            <p>Documento postal</p>
            <h1>Autorização de retirada</h1>
          </div>
          <nav className="header-nav">
            <Link href="/" className="nav-link">
              Etiqueta
            </Link>
            <span className="nav-link nav-active">Autorização</span>
          </nav>
        </div>
      </header>

      {step === "form" ? (
        <form className="auth-workspace" onSubmit={handleSubmit}>
          <div className="form-panel">
            {/* Authorized person */}
            <section className="form-section">
              <h2>Pessoa autorizada</h2>
              <div className="field-grid">
                <FormField label="Nome completo" wide>
                  <input
                    value={data.authorized.name}
                    onChange={(e) =>
                      setNested("authorized")("name", e.target.value)
                    }
                    required
                  />
                </FormField>
                <FormField label="RG">
                  <input
                    value={data.authorized.rg}
                    onChange={(e) =>
                      setNested("authorized")("rg", formatRg(e.target.value))
                    }
                    placeholder="00.000.000-0"
                    required
                  />
                </FormField>
                <FormField label="CPF">
                  <input
                    value={data.authorized.cpf}
                    onChange={(e) =>
                      setNested("authorized")("cpf", formatCpf(e.target.value))
                    }
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    required
                  />
                </FormField>
              </div>
            </section>

            {/* Object */}
            <section className="form-section">
              <h2>Objeto</h2>
              <div className="field-grid">
                <FormField label="Número do objeto" wide>
                  <input
                    value={data.objectNumber}
                    onChange={(e) =>
                      set("objectNumber", e.target.value.toUpperCase())
                    }
                    placeholder="AA000000000BR"
                    required
                  />
                </FormField>
                <FormField label="Postado por (remetente)" wide>
                  <input
                    value={data.senderName}
                    onChange={(e) => set("senderName", e.target.value)}
                    required
                  />
                </FormField>
              </div>
            </section>

            {/* Date & location */}
            <section className="form-section">
              <h2>Local e data</h2>
              <div className="field-grid">
                <FormField label="Cidade">
                  <input
                    value={data.city}
                    onChange={(e) => set("city", e.target.value)}
                    required
                  />
                </FormField>
                <FormField label="Data">
                  <input
                    type="date"
                    value={data.date}
                    onChange={(e) => set("date", e.target.value)}
                    required
                  />
                </FormField>
              </div>
            </section>

            {/* Owner (authorizing person) */}
            <section className="form-section">
              <h2>Destinatário (quem autoriza)</h2>
              <div className="field-grid">
                <FormField label="Nome completo" wide>
                  <input
                    value={data.owner.name}
                    onChange={(e) => setNested("owner")("name", e.target.value)}
                    required
                  />
                </FormField>
                <FormField label="RG">
                  <input
                    value={data.owner.rg}
                    onChange={(e) =>
                      setNested("owner")("rg", formatRg(e.target.value))
                    }
                    placeholder="00.000.000-0"
                    required
                  />
                </FormField>
                <FormField label="CPF">
                  <input
                    value={data.owner.cpf}
                    onChange={(e) =>
                      setNested("owner")("cpf", formatCpf(e.target.value))
                    }
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    required
                  />
                </FormField>
              </div>
            </section>

            <div className="form-actions">
              <button
                type="button"
                className="danger-button"
                onClick={handleClear}
              >
                <Trash2 size={16} />
                Limpar
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={!valid}
              >
                <Printer size={16} />
                Ver impressão
              </button>
            </div>
          </div>

          <aside className="preview-panel">
            <div className="sheet-preview">
              <div className="label-card recipient-card">
                <h3>PESSOA AUTORIZADA</h3>
                <strong>{data.authorized.name}</strong>
                {data.authorized.rg && <span>RG: {data.authorized.rg}</span>}
                {data.authorized.cpf && <span>CPF: {data.authorized.cpf}</span>}
                {data.objectNumber && <span>Objeto: {data.objectNumber}</span>}
                {data.senderName && <span>Remetente: {data.senderName}</span>}
              </div>
              <div className="label-card sender-card">
                <h3>DESTINATÁRIO (QUEM AUTORIZA)</h3>
                <strong>{data.owner.name}</strong>
                {data.owner.rg && <span>RG: {data.owner.rg}</span>}
                {data.owner.cpf && <span>CPF: {data.owner.cpf}</span>}
                {(data.city || data.date) && (
                  <span>
                    {data.city}
                    {data.city && data.date ? ", " : ""}
                    {formatDateBR(data.date)}
                  </span>
                )}
              </div>
            </div>
          </aside>
        </form>
      ) : (
        <div className="print-layout">
          <div className="print-toolbar no-print">
            <button
              className="secondary-button"
              onClick={() => setStep("form")}
            >
              <ArrowLeft size={18} />
              Editar dados
            </button>
            <button
              className="secondary-button"
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
            >
              <FileDown size={18} />
              {pdfLoading ? "Gerando..." : "Baixar PDF"}
            </button>
            <button
              className="primary-button"
              onClick={handlePrint}
              disabled={printLoading}
            >
              <Printer size={18} />
              {printLoading ? "Preparando..." : "Imprimir"}
            </button>
          </div>
          <div className="print-page-container">
            <PrintableAuth data={data} />
          </div>
        </div>
      )}
    </main>
  );
}
