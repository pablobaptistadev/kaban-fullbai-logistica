import React, { useState, useEffect } from "react";
import {
  Edit3,
  Plus,
  X,
  Trash2,
  RotateCcw,
  Sun,
  Moon,
  Server,
  Loader2,
} from "lucide-react";

type Card = {
  id: string;
  title: string;
  content: string;
};

type Column = {
  id: string;
  title: string;
  cards: Card[];
};

type EditingCardState = { colId: string; card: Card };
type DraggedCardState = { card: Card; colId: string };

// ============================================================================
// DADOS INICIAIS (FLUXO LOGÍSTICO)
// ============================================================================
const defaultData: Column[] = [
  {
    id: "col-1",
    title: "Origem & Preparação",
    cards: [
      {
        id: "c1",
        title: "FASE 1: Intake (Loja)",
        content:
          "• Cellshop / Fullbai\n• POST /api/v1/orders\n• Payload: external_order_id, customer...\n• Status: pending\n• BG: R2 images + PDF Code128",
      },
      {
        id: "c2",
        title: "FASE 2: Seller (Listo)",
        content:
          '• /admin/seller/pending-products\n• Vendedor clica "Marcar como listo"\n• POST /.../ready\n• Status: ready',
      },
    ],
  },
  {
    id: "col-2",
    title: "Hub Asunción (PY)",
    cards: [
      {
        id: "c3",
        title: "FASE 3: HUB CDE (Recebe)",
        content:
          "• /admin/receive-products\n• Operador bipa scan_code\n• POST /api/v1/cde/scan\n• Status: delivered (PY)",
      },
      {
        id: "c4",
        title: "FASE 4: Consolidação",
        content:
          "• POST /api/v1/cde/consolidate\n• Regra Aduana PY: +3 unidades familia\n• Cria logistics.package (PKG-...)",
      },
    ],
  },
  {
    id: "col-3",
    title: "Internacional (Aduana)",
    cards: [
      {
        id: "c5",
        title: "FASE 5: Cargo Manifest",
        content:
          "• Admin cria manifest (POST)\n• Provider: RaCargo (PRESIS)\n• Status: open",
      },
      {
        id: "c6",
        title: "FASE 6: Embarque Presis",
        content:
          "• Worker: dispatchRacargo()\n• Carga Preclasificacion (fatura, codMaria)\n• Recebe codigoSeguimiento\n• Manifest: dispatched / Order: shipped",
      },
      {
        id: "c7",
        title: "FASE 7: Tracking (AR)",
        content:
          "• Voo PY -> AR -> Aduana\n• Webhooks PRESIS ou Polling 30m\n• 001(customs) / 002(transit) / 003(delivered depot)",
      },
    ],
  },
  {
    id: "col-4",
    title: "Última Milha (AR)",
    cards: [
      {
        id: "c8",
        title: "FASE 8: Última Milla",
        content:
          "• OcaDriver / FixyDriver acionados\n• OCA/Fixy ATIVOS (tracking próprio)\n• RaCargo is_active=false (Handoff)\n• Status: out_for_delivery",
      },
      {
        id: "c9",
        title: "Entrega Final",
        content:
          "• Webhook OCA/Fixy confirma\n• Cliente recebe na porta\n• Status: delivered",
      },
    ],
  },
];

export default function KanbanApp() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [editingCard, setEditingCard] = useState<EditingCardState | null>(
    null
  );
  const [draggedCard, setDraggedCard] = useState<DraggedCardState | null>(
    null
  );
  const [isDark, setIsDark] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // ============================================================================
  // INJETAR TAILWIND CSS & CARREGAR DADOS DO LOCALSTORAGE
  // ============================================================================
  useEffect(() => {
    // 1. Injetar o Tailwind CSS no CodeSandbox automaticamente
    if (!document.getElementById("tailwind-script")) {
      const script = document.createElement("script");
      script.id = "tailwind-script";
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }

    // 2. Carregar os dados guardados
    const saved = localStorage.getItem("kanban_logistica_v2");
    if (saved) {
      try {
        setColumns(JSON.parse(saved));
      } catch (e) {
        setColumns(defaultData);
      }
    } else {
      setColumns(defaultData);
    }
    setIsLoaded(true);
  }, []);

  // ============================================================================
  // FUNÇÃO CENTRAL PARA ATUALIZAR E SALVAR LOCALMENTE
  // ============================================================================
  const updateColumns = (
    newColsOrUpdater: Column[] | ((prev: Column[]) => Column[])
  ) => {
    setIsSaving(true);
    setColumns((prev) => {
      const newCols =
        typeof newColsOrUpdater === "function"
          ? newColsOrUpdater(prev)
          : newColsOrUpdater;

      // Salva no navegador do utilizador
      localStorage.setItem("kanban_logistica_v2", JSON.stringify(newCols));

      setTimeout(() => setIsSaving(false), 500); // feedback visual rápido
      return newCols;
    });
  };

  const resetToDefault = () => {
    if (
      window.confirm(
        "Deseja repor o fluxo original? Todas as suas alterações serão perdidas."
      )
    ) {
      updateColumns(defaultData);
    }
  };

  // ============================================================================
  // DRAG & DROP LOGIC
  // ============================================================================
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    card: Card,
    colId: string
  ) => {
    setDraggedCard({ card, colId });
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = "0.4";
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).style.opacity = "1";
    setDraggedCard(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) =>
    e.preventDefault();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetColId: string) => {
    e.preventDefault();
    if (!draggedCard) return;
    const { card, colId: sourceColId } = draggedCard;
    if (sourceColId === targetColId) return;

    updateColumns((prev) => {
      const newCols = JSON.parse(JSON.stringify(prev)) as Column[]; // Deep copy
      const sourceCol = newCols.find((c) => c.id === sourceColId);
      const targetCol = newCols.find((c) => c.id === targetColId);
      if (!sourceCol || !targetCol) return prev;

      sourceCol.cards = sourceCol.cards.filter((c) => c.id !== card.id);
      targetCol.cards.push(card);
      return newCols;
    });
  };

  // ============================================================================
  // EDIT LOGIC
  // ============================================================================
  const openEdit = (colId: string, card: Card) => {
    setEditingCard({ colId, card: { ...card } });
    setConfirmDelete(false);
  };

  const saveEdit = () => {
    if (!editingCard) return;
    const { colId, card: editCard } = editingCard;
    updateColumns((prev) =>
      prev.map((col) => {
        if (col.id === colId) {
          return {
            ...col,
            cards: col.cards.map((c) =>
              c.id === editCard.id ? editCard : c
            ),
          };
        }
        return col;
      })
    );
    setEditingCard(null);
  };

  const handleDelete = () => {
    if (!editingCard) return;
    const { colId, card: delCard } = editingCard;
    updateColumns((prev) =>
      prev.map((col) => {
        if (col.id === colId) {
          return {
            ...col,
            cards: col.cards.filter((c) => c.id !== delCard.id),
          };
        }
        return col;
      })
    );
    setEditingCard(null);
    setConfirmDelete(false);
  };

  const addNewCard = (colId: string) => {
    const newCard: Card = {
      id: "card-" + Date.now(),
      title: "Nova Etapa",
      content: "Descreva a etapa aqui...",
    };
    updateColumns((prev) =>
      prev.map((col) => {
        if (col.id === colId) {
          return { ...col, cards: [...col.cards, newCard] };
        }
        return col;
      })
    );
    openEdit(colId, newCard);
  };

  // ============================================================================
  // RENDER (APPLE PREMIUM GRAYSCALE THEME)
  // ============================================================================

  // Design Tokens (Claro vs Escuro)
  const theme = isDark
    ? {
        bg: "bg-[#000000]",
        text: "text-[#F5F5F7]",
        textMuted: "text-[#86868B]",
        cardBg: "bg-[#1C1C1E]",
        cardBorder: "border-[#38383A]",
        cardHover: "hover:bg-[#2C2C2E]",
        inputBg: "bg-[#2C2C2E]",
        btnPrimary: "bg-[#FFFFFF] text-[#000000] hover:bg-[#E5E5EA]",
        btnSecondary: "bg-[#2C2C2E] text-[#F5F5F7] hover:bg-[#38383A]",
        modalBg: "bg-[#1C1C1E]",
        modalOverlay: "bg-black/60",
      }
    : {
        bg: "bg-[#F5F5F7]",
        text: "text-[#1D1D1F]",
        textMuted: "text-[#86868B]",
        cardBg: "bg-[#FFFFFF]",
        cardBorder: "border-[#E5E5EA]",
        cardHover: "hover:bg-[#F5F5F7]",
        inputBg: "bg-[#F5F5F7]",
        btnPrimary: "bg-[#1D1D1F] text-[#FFFFFF] hover:bg-[#000000]",
        btnSecondary:
          "bg-[#FFFFFF] text-[#1D1D1F] hover:bg-[#E5E5EA] border border-[#E5E5EA]",
        modalBg: "bg-[#FFFFFF]",
        modalOverlay: "bg-black/20",
      };

  if (!isLoaded) return null;

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
          .font-dm { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: -0.02em; }
          /* Scrollbar estilo Apple */
          ::-webkit-scrollbar { width: 8px; height: 8px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #86868B; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
        `}
      </style>

      <div
        className={`min-h-screen font-dm p-4 md:p-8 flex flex-col transition-colors duration-300 ${theme.bg} ${theme.text}`}
      >
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              Fluxo Logístico
            </h1>
            <div
              className={`text-sm mt-1 font-medium flex items-center gap-2 ${theme.textMuted}`}
            >
              <span>Intake → Hub → Aduana → Delivery</span>
              <span
                className="flex items-center gap-1 text-[11px] ml-2 px-2 py-0.5 rounded-full border opacity-70"
                style={{ borderColor: "currentColor" }}
              >
                {isSaving ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Server size={10} />
                )}
                {isSaving ? "A guardar..." : "Guardado Localmente"}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2.5 rounded-full transition-colors flex items-center justify-center shadow-sm ${theme.btnSecondary}`}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={resetToDefault}
              className={`px-4 py-2 rounded-full transition-colors text-sm font-medium flex items-center gap-2 shadow-sm ${theme.btnSecondary}`}
            >
              <RotateCcw size={16} /> Original
            </button>
          </div>
        </div>

        {/* BOARD (COLUNAS) */}
        <div className="flex-1 flex gap-5 overflow-x-auto pb-8 items-start">
          {columns.map((col) => (
            <div
              key={col.id}
              className={`flex-shrink-0 w-[320px] rounded-2xl border flex flex-col shadow-sm transition-colors duration-300 ${theme.cardBg} ${theme.cardBorder}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Header da Coluna */}
              <div
                className={`p-5 pb-3 flex justify-between items-center rounded-t-2xl`}
              >
                <h2 className="font-semibold text-[15px]">{col.title}</h2>
                <span
                  className={`text-[11px] py-0.5 px-2.5 rounded-full font-medium ${theme.inputBg} ${theme.textMuted}`}
                >
                  {col.cards.length}
                </span>
              </div>

              {/* Área dos Cartões */}
              <div className="p-3 pt-0 flex-1 overflow-y-auto flex flex-col gap-3 min-h-[150px]">
                {col.cards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card, col.id)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-xl p-4 cursor-grab active:cursor-grabbing transition-all group relative border ${theme.cardBorder} ${theme.cardBg} ${theme.cardHover}`}
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-sm leading-tight pr-6">
                        {card.title}
                      </h3>
                      <button
                        onClick={() => openEdit(col.id, card)}
                        className={`absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity ${theme.textMuted} hover:${theme.text}`}
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                    <pre
                      className={`text-[13px] whitespace-pre-wrap font-sans leading-relaxed opacity-80`}
                    >
                      {card.content}
                    </pre>
                  </div>
                ))}

                <button
                  onClick={() => addNewCard(col.id)}
                  className={`flex items-center justify-center gap-2 p-3 mt-1 rounded-xl transition-colors text-[13px] font-medium border border-transparent ${theme.textMuted} hover:${theme.inputBg} hover:${theme.cardBorder}`}
                >
                  <Plus size={16} /> Adicionar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL DE EDIÇÃO */}
        {editingCard && (
          <div
            className={`fixed inset-0 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-opacity ${theme.modalOverlay}`}
          >
            <div
              className={`rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border ${theme.cardBorder} ${theme.modalBg}`}
              style={{ boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
            >
              <div className="flex justify-between items-center p-6 pb-4">
                <h3 className="text-lg font-semibold">Editar Etapa</h3>
                <button
                  onClick={() => setEditingCard(null)}
                  className={`p-2 rounded-full hover:${theme.inputBg} ${theme.textMuted}`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-6 flex flex-col gap-5">
                <div>
                  <label
                    className={`block text-[11px] font-semibold mb-2 uppercase tracking-wider ${theme.textMuted}`}
                  >
                    Título
                  </label>
                  <input
                    type="text"
                    value={editingCard.card.title}
                    onChange={(e) =>
                      setEditingCard({
                        ...editingCard,
                        card: { ...editingCard.card, title: e.target.value },
                      })
                    }
                    className={`w-full rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-gray-400 border border-transparent focus:${theme.cardBorder} transition-all ${theme.inputBg} ${theme.text}`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-[11px] font-semibold mb-2 uppercase tracking-wider ${theme.textMuted}`}
                  >
                    Descrição / API
                  </label>
                  <textarea
                    value={editingCard.card.content}
                    onChange={(e) =>
                      setEditingCard({
                        ...editingCard,
                        card: { ...editingCard.card, content: e.target.value },
                      })
                    }
                    rows={5}
                    className={`w-full rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-gray-400 border border-transparent focus:${theme.cardBorder} transition-all resize-none ${theme.inputBg} ${theme.text}`}
                  />
                </div>
              </div>

              <div className="p-6 pt-8 flex justify-between items-center">
                {/* Botão Apagar Inteligente */}
                {confirmDelete ? (
                  <div className="flex items-center gap-2 bg-red-500/10 text-red-500 p-1 pl-3 rounded-full text-sm font-medium">
                    <span>Certeza?</span>
                    <button
                      onClick={handleDelete}
                      className="bg-red-500 text-white px-3 py-1.5 rounded-full hover:bg-red-600 transition-colors"
                    >
                      Sim
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1.5 hover:text-red-600"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-colors text-sm font-medium text-red-500 hover:bg-red-500/10`}
                  >
                    <Trash2 size={16} /> Apagar
                  </button>
                )}

                <button
                  onClick={saveEdit}
                  className={`px-6 py-2.5 text-sm font-medium rounded-full transition-transform active:scale-95 ${theme.btnPrimary}`}
                >
                  Concluído
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
