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
  return (
    <div
      className="print-label-half"
      style={{ padding: "56px 52px 48px", minHeight: "566px" }}
    >
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

      <div className="auth-signature-line" />

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
  );
}

async function downloadPdf(selector: string, filename: string) {
  const element = document.querySelector(selector) as HTMLElement | null;
  if (!element) return;
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  // Same layout as Etiqueta PDF: A4 landscape, 40% blank left, 60% content right
  const BLANK_FRACTION = 0.4;
  const CONTENT_FRACTION = 0.6;
  // A4 landscape: 297mm wide × 210mm tall
  // Content area: 297*0.6 = 178.2mm wide, 210mm tall → ratio height/width = 210/178.2
  const elemWidth = element.offsetWidth;
  const contentAreaRatio = 210 / (297 * CONTENT_FRACTION);
  const targetHeight = Math.round(elemWidth * contentAreaRatio);
  const prevMinHeight = element.style.minHeight;
  element.style.minHeight = `${targetHeight}px`;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  element.style.minHeight = prevMinHeight;

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm
  const contentX = pageWidth * BLANK_FRACTION; // 118.8mm from left
  const contentW = pageWidth * CONTENT_FRACTION; // 178.2mm wide
  pdf.addImage(imgData, "PNG", contentX, 0, contentW, pageHeight);
  pdf.save(filename);
}

export default function AutorizacaoPage() {
  const [data, setData] = useState<AuthData>(loadFromStorage);
  const [step, setStep] = useState<"form" | "print">("form");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

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

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadPdf(".print-label-half", "autorizacao.pdf");
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

          {/* Live preview */}
          <aside className="preview-panel" style={{ padding: 0 }}>
            <PrintableAuth data={data} />
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
            <button className="primary-button" onClick={() => window.print()}>
              <Printer size={18} />
              Imprimir
            </button>
          </div>
          <div className="print-page-container">
            <div className="print-page">
              <div className="print-blank-half" />
              <PrintableAuth data={data} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
