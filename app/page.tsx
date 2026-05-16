"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, FileDown, Printer, Trash2 } from "lucide-react";
import Link from "next/link";

type Address = {
  name: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
};

type LabelData = {
  recipient: Address;
  sender: Address;
  registroModico: boolean;
};

const emptyAddress: Address = {
  name: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  cep: "",
};

const initialData: LabelData = {
  recipient: { ...emptyAddress },
  sender: { ...emptyAddress },
  registroModico: false,
};

const STORAGE_KEY = "etiqueta-data";

const states = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

function loadFromStorage(): LabelData {
  if (typeof window === "undefined") return initialData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialData;
    const parsed = JSON.parse(raw);
    return {
      recipient: { ...emptyAddress, ...parsed.recipient },
      sender: { ...emptyAddress, ...parsed.sender },
      registroModico: Boolean(parsed.registroModico),
    };
  } catch {
    return initialData;
  }
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d{0,3}).*/, (_, a, b) =>
    b ? `${a}-${b}` : a,
  );
}

function cepDigits(value: string) {
  return value.replace(/\D/g, "");
}

function lineOne(address: Address) {
  return [address.street, address.number ? `${address.number}` : ""]
    .filter(Boolean)
    .join(", ");
}

function hasRequiredAddressFields(address: Address) {
  return Boolean(
    address.name &&
    address.street &&
    address.number &&
    address.neighborhood &&
    address.city &&
    address.state &&
    cepDigits(address.cep).length === 8,
  );
}

function AddressFields({
  title,
  value,
  onChange,
  isLoadingCep,
  cepError,
}: {
  title: string;
  value: Address;
  onChange: (field: keyof Address, nextValue: string) => void;
  isLoadingCep: boolean;
  cepError: string;
}) {
  return (
    <section className="form-section">
      <h2>{title}</h2>
      <div className="field-grid">
        <label className="field">
          <span>CEP</span>
          <input
            inputMode="numeric"
            value={value.cep}
            onChange={(e) => onChange("cep", formatCep(e.target.value))}
            placeholder="00000-000"
            required
          />
          {isLoadingCep && (
            <small className="field-hint">Buscando CEP...</small>
          )}
          {cepError && <small className="field-error">{cepError}</small>}
        </label>
        <label className="field wide">
          <span>Nome</span>
          <input
            value={value.name}
            onChange={(e) => onChange("name", e.target.value)}
            required
          />
        </label>
        <label className="field wide">
          <span>Endereço</span>
          <input
            value={value.street}
            onChange={(e) => onChange("street", e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Número</span>
          <input
            value={value.number}
            onChange={(e) => onChange("number", e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Complemento</span>
          <input
            value={value.complement}
            onChange={(e) => onChange("complement", e.target.value)}
          />
        </label>
        <label className="field">
          <span>Bairro</span>
          <input
            value={value.neighborhood}
            onChange={(e) => onChange("neighborhood", e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Cidade</span>
          <input
            value={value.city}
            onChange={(e) => onChange("city", e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>UF</span>
          <select
            value={value.state}
            onChange={(e) => onChange("state", e.target.value)}
            required
          >
            <option value="">Selecione</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function RegistroModicoStamp() {
  return (
    <div className="registro-stamp">
      <div>IMPRESSO</div>
      <small>PODE SER ABERTO PELA E.C.T.</small>
      <strong>REGISTRO MÓDICO</strong>
    </div>
  );
}

function PrintableLabel({ data }: { data: LabelData }) {
  const cepValue = cepDigits(data.recipient.cep) || "00000000";
  const qrValue = [
    data.recipient.name,
    `${data.recipient.street}, ${data.recipient.number}`,
    data.recipient.complement,
    data.recipient.neighborhood,
    `${data.recipient.city}-${data.recipient.state}`,
    `CEP: ${data.recipient.cep}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="print-page">
      <div className="print-blank-half" />
      <div className="print-label-half">
        {/* USO EXCLUSIVO section */}
        <div className="exclusive-section">
          <div className="corner-mark corner-tl" />
          <div className="corner-mark corner-tr" />
          <div className="exclusive-body">
            <p className="exclusive-title">USO EXCLUSIVO DOS CORREIOS</p>
            <p className="exclusive-subtitle">
              Cole aqui a etiqueta com o código identificador da encomenda
            </p>
          </div>
          <div className="corner-mark corner-bl" />
          <div className="corner-mark corner-br" />
        </div>

        {/* Label section */}
        <div className="label-section-wrap">
          <div className="receiver-lines">
            <div className="receiver-line">
              <span>Recebedor:</span>
              <span className="line-fill" />
            </div>
            <div className="receiver-line">
              <span>Assinatura:</span>
              <span className="line-fill" />
              <span style={{ marginLeft: 24 }}>Documento:</span>
              <span className="line-fill" />
            </div>
          </div>

          <div className="main-label">
            <div className="label-body">
              <div className="destinatario-header">DESTINATÁRIO</div>
              <div className="recipient-details">
                <div className="recipient-name">
                  {data.recipient.name.toUpperCase()}
                </div>
                <div>
                  {data.recipient.street} {data.recipient.number}
                </div>
                {data.recipient.complement && (
                  <div>{data.recipient.complement}</div>
                )}
                <div>{data.recipient.neighborhood}</div>
              </div>
              <div className="cep-city-line">
                <span className="cep-large">{data.recipient.cep}</span>
                <span className="city-large">
                  {data.recipient.city}
                  {data.recipient.state ? `-${data.recipient.state}` : ""}
                </span>
              </div>
              <div className="barcode-wrap">
                <Barcode
                  value={cepValue}
                  width={2}
                  height={55}
                  displayValue={false}
                  renderer="svg"
                  margin={0}
                />
              </div>
            </div>
            <div className="label-side">
              <div className="qr-wrap">
                <QRCodeSVG value={qrValue || "sem dados"} size={110} />
              </div>
              {data.registroModico && (
                <div className="stamp-wrap">
                  <RegistroModicoStamp />
                </div>
              )}
            </div>
          </div>

          <div className="sender-info">
            <p>
              <strong>Remetente:</strong>
              {data.sender.name}
            </p>
            <p>{lineOne(data.sender)}</p>
            {data.sender.complement && <p>{data.sender.complement}</p>}
            <p>{data.sender.neighborhood}</p>
            {(data.sender.cep || data.sender.city || data.sender.state) && (
              <p>
                <b>{data.sender.cep && <>{data.sender.cep} </>}</b>
                {data.sender.city}
                {data.sender.state ? `-${data.sender.state}` : ""}
              </p>
            )}
          </div>
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

export default function Home() {
  const [data, setData] = useState<LabelData>(initialData);
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<"form" | "print">("form");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [cepStatus, setCepStatus] = useState({
    recipient: { isLoading: false, error: "" },
    sender: { isLoading: false, error: "" },
  });

  const isValid =
    hasRequiredAddressFields(data.recipient) &&
    hasRequiredAddressFields(data.sender);

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

  const updateAddress =
    (section: "recipient" | "sender") =>
    (field: keyof Address, value: string) => {
      setData((current) => ({
        ...current,
        [section]: { ...current[section], [field]: value },
      }));
    };

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
      await downloadPdf(".print-page", "etiqueta.pdf");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClear = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setData({
      recipient: { ...emptyAddress },
      sender: { ...emptyAddress },
      registroModico: false,
    });
    setStep("form");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isValid) setStep("print");
  };

  const toggleRegistroModico = (event: ChangeEvent<HTMLInputElement>) => {
    setData((current) => ({
      ...current,
      registroModico: event.target.checked,
    }));
  };

  useEffect(() => {
    const sections = ["recipient", "sender"] as const;
    const controllers = sections.map((section) => {
      const cep = cepDigits(data[section].cep);
      if (cep.length !== 8) {
        setCepStatus((current) => ({
          ...current,
          [section]: { isLoading: false, error: "" },
        }));
        return null;
      }
      const controller = new AbortController();
      const timeoutId = window.setTimeout(async () => {
        setCepStatus((current) => ({
          ...current,
          [section]: { isLoading: true, error: "" },
        }));
        try {
          const response = await fetch(`/api/cep/${cep}`, {
            signal: controller.signal,
          });
          const payload = await response.json();
          if (!response.ok)
            throw new Error("Não foi possível consultar o CEP.");
          if (payload.erro) throw new Error("CEP não encontrado.");
          setData((current) => ({
            ...current,
            [section]: {
              ...current[section],
              street: payload.logradouro ?? current[section].street,
              complement: payload.complemento || current[section].complement,
              neighborhood: payload.bairro ?? current[section].neighborhood,
              city: payload.localidade ?? current[section].city,
              state: payload.uf ?? current[section].state,
            },
          }));
          setCepStatus((current) => ({
            ...current,
            [section]: { isLoading: false, error: "" },
          }));
        } catch (error) {
          if (controller.signal.aborted) return;
          setCepStatus((current) => ({
            ...current,
            [section]: {
              isLoading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Não foi possível consultar o CEP.",
            },
          }));
        }
      }, 350);
      return { controller, timeoutId };
    });
    return () => {
      controllers.forEach((entry) => {
        if (!entry) return;
        window.clearTimeout(entry.timeoutId);
        entry.controller.abort();
      });
    };
  }, [data.recipient.cep, data.sender.cep]);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div className="header-inner">
          <div>
            <p>Etiqueta postal</p>
            <h1>Gerador de impressão</h1>
          </div>
          <nav className="header-nav">
            <span className="nav-link nav-active">Etiqueta</span>
            <Link href="/autorizacao" className="nav-link">
              Autorização
            </Link>
          </nav>
        </div>
      </header>

      {step === "form" ? (
        <form className="workspace" onSubmit={handleSubmit}>
          <div className="form-panel">
            <AddressFields
              title="Destinatário"
              value={data.recipient}
              onChange={updateAddress("recipient")}
              isLoadingCep={cepStatus.recipient.isLoading}
              cepError={cepStatus.recipient.error}
            />
            <AddressFields
              title="Remetente"
              value={data.sender}
              onChange={updateAddress("sender")}
              isLoadingCep={cepStatus.sender.isLoading}
              cepError={cepStatus.sender.error}
            />
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={data.registroModico}
                onChange={toggleRegistroModico}
              />
              <span>Adicionar selo de Registro Módico</span>
            </label>
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
                disabled={!isValid}
              >
                <Printer size={16} />
                Ver impressão
              </button>
            </div>
          </div>

          <aside className="preview-panel">
            <div className="sheet-preview">
              <div className="label-card recipient-card">
                <h3>DESTINATÁRIO</h3>
                <strong>{data.recipient.name}</strong>
                <span>{lineOne(data.recipient)}</span>
                {data.recipient.complement && (
                  <span>{data.recipient.complement}</span>
                )}
                <span>{data.recipient.neighborhood}</span>
                <span>
                  {data.recipient.city}
                  {data.recipient.state ? `-${data.recipient.state}` : ""}
                </span>
                <span>CEP: {data.recipient.cep}</span>
              </div>
              <div className="label-card sender-card">
                <h3>REMETENTE</h3>
                <strong>{data.sender.name}</strong>
                <span>{lineOne(data.sender)}</span>
                {data.sender.complement && (
                  <span>{data.sender.complement}</span>
                )}
                <span>{data.sender.neighborhood}</span>
                <span>
                  {data.sender.city}
                  {data.sender.state ? `-${data.sender.state}` : ""}
                </span>
                <span>{data.sender.cep}</span>
              </div>
              {data.registroModico && <RegistroModicoStamp />}
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
            <PrintableLabel data={data} />
          </div>
        </div>
      )}
    </main>
  );
}
