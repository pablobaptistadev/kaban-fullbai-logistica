import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Edit3,
  Plus,
  X,
  Sun,
  Moon,
  Server,
  Loader2,
  FolderPlus,
  LayoutGrid,
  LogOut,
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import type {
  Card,
  Column,
  Disableable,
  Workspace,
} from "./types/kanban";
import { isActive } from "./types/kanban";
import { supabaseConfigured } from "./lib/supabase";
import { useAuth, signOut } from "./lib/auth";
import LoginScreen from "./components/LoginScreen";
import { isStorageWritable, readLocal, writeLocal } from "./lib/safeStorage";
import { loadFromCloud, scheduleSaveToCloud } from "./lib/cloudKanban";
import {
  loadWorkspaceFromLocal,
  saveWorkspaceToLocal,
  createBlankProject,
  hasLocalBoard,
} from "./lib/workspaceStorage";

/** Tokens de estilo do tema, partilhados com os subcomponentes. */
type ThemeTokens = Record<string, string>;

type EditingCardState = { colId: string; card: Card };
type DraggedCardState = { card: Card; colId: string };
type EditingColumnState = { colId: string; title: string };

const THEME_KEY = "kanban_logistica_theme_v1";
const DEFAULT_BOARD_TITLE = "Roadmap Logística";

export default function KanbanApp() {
  const [workspace, setWorkspace] = useState<Workspace>({
    projects: [],
    activeProjectId: "",
  });
  const [editingCard, setEditingCard] = useState<EditingCardState | null>(
    null
  );
  const [editingColumn, setEditingColumn] = useState<EditingColumnState | null>(
    null
  );
  const [draggedCard, setDraggedCard] = useState<DraggedCardState | null>(
    null
  );
  const [isDark, setIsDark] = useState(true);
  const [showArchive, setShowArchive] = useState(false);
  // Falso em navegação privada do Safari e afins: aí nada fica guardado.
  const [canStore] = useState(isStorageWritable);
  const auth = useAuth();
  // Só carrega o quadro quando já se sabe quem (ou se) está autenticado.
  const podeCarregar =
    auth.status === "desligado" || auth.status === "dentro";
  const userId = auth.status === "dentro" ? auth.session.user.id : null;
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [boardTitle, setBoardTitle] = useState(DEFAULT_BOARD_TITLE);
  const workspaceRef = useRef<Workspace>({
    projects: [],
    activeProjectId: "",
  });

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  const activeProject = useMemo(() => {
    return (
      workspace.projects.find((p) => p.id === workspace.activeProjectId) ??
      workspace.projects[0]
    );
  }, [workspace.projects, workspace.activeProjectId]);

  // `columns` é a lista completa (fonte de verdade para gravar); `activeColumns`
  // é o que o quadro mostra. Os desativados ficam guardados para o histórico.
  const columns = activeProject?.columns ?? [];
  const activeColumns = useMemo(() => columns.filter(isActive), [columns]);
  const activeProjects = useMemo(
    () => workspace.projects.filter(isActive),
    [workspace.projects]
  );

  /**
   * Histórico de desativados. Os cartões listados são só os que estão em
   * blocos ativos — os de um bloco desativado voltam com o próprio bloco,
   * por isso não são repetidos aqui.
   */
  const archive = useMemo(() => {
    const projects = workspace.projects.filter((p) => !isActive(p));
    const blocks = columns.filter((c) => !isActive(c));
    const cards = columns
      .filter(isActive)
      .flatMap((col) =>
        col.cards.filter((c) => !isActive(c)).map((card) => ({ col, card }))
      );
    return {
      projects,
      blocks,
      cards,
      total: projects.length + blocks.length + cards.length,
    };
  }, [workspace.projects, columns]);
  const [isEditingBoardTitle, setIsEditingBoardTitle] = useState(false);
  const boardTitleSnapshot = useRef(DEFAULT_BOARD_TITLE);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const skipTitleBlurCommit = useRef(false);
  const isDarkRef = useRef(true);
  const columnInputRef = useRef<HTMLInputElement>(null);
  const skipColumnBlurCommit = useRef(false);
  const columnTitleSnapshot = useRef("");

  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  useEffect(() => {
    if (isEditingBoardTitle) return;
    const p = workspace.projects.find(
      (x) => x.id === workspace.activeProjectId
    );
    if (p) setBoardTitle(p.boardTitle);
  }, [workspace.activeProjectId, workspace.projects, isEditingBoardTitle]);

  // ============================================================================
  // CARREGAR DADOS DO LOCALSTORAGE / NUVEM
  // (o Tailwind é compilado no build — ver src/styles.css e tailwind.config.js)
  // ============================================================================
  useEffect(() => {
    if (!podeCarregar) return;
    let cancelled = false;
    setIsLoaded(false);

    async function init() {
      if (supabaseConfigured) {
        try {
          const cloud = await loadFromCloud();
          if (cancelled) return;
          if (cloud) {
            setWorkspace(cloud.workspace);
            saveWorkspaceToLocal(cloud.workspace);
            const ap = cloud.workspace.projects.find(
              (p) => p.id === cloud.workspace.activeProjectId
            );
            setBoardTitle(ap?.boardTitle ?? DEFAULT_BOARD_TITLE);
            setIsDark(cloud.themeDark);
            isDarkRef.current = cloud.themeDark;
            writeLocal(THEME_KEY, cloud.themeDark ? "dark" : "light");
            setIsLoaded(true);
            return;
          }
        } catch (e) {
          console.warn("Nuvem indisponível, a usar dados locais.", e);
        }
      }

      const jaTinhaQuadroLocal = hasLocalBoard();
      const ws = loadWorkspaceFromLocal();
      const ap = ws.projects.find((p) => p.id === ws.activeProjectId);
      let themeDark = true;
      const themeStored = readLocal(THEME_KEY);
      if (themeStored === "light") themeDark = false;
      if (themeStored === "dark") themeDark = true;

      if (cancelled) return;
      setWorkspace(ws);
      setBoardTitle(ap?.boardTitle ?? DEFAULT_BOARD_TITLE);
      setIsDark(themeDark);
      isDarkRef.current = themeDark;

      // Só envia para a nuvem o que é mesmo deste browser. Um quadro-semente
      // acabado de gerar fica por enviar, para não carimbar o quadro real que
      // outro dispositivo ainda não sincronizou.
      if (supabaseConfigured && jaTinhaQuadroLocal) {
        scheduleSaveToCloud(ws, themeDark);
      }

      setIsLoaded(true);
    }

    void init();

    return () => {
      cancelled = true;
    };
    // Recarrega ao entrar/sair: cada conta tem o seu quadro.
  }, [podeCarregar, userId]);

  useEffect(() => {
    if (!isLoaded) return;
    const t = boardTitle.trim() || DEFAULT_BOARD_TITLE;
    document.title = t;
  }, [boardTitle, isLoaded]);

  useEffect(() => {
    if (isEditingBoardTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingBoardTitle]);

  // Depende só do id da coluna em edição, não do objeto `editingColumn`:
  // cada tecla cria um objeto novo, e com `[editingColumn]` o efeito voltava a
  // correr a cada tecla, selecionando o texto todo — a tecla seguinte apagava-o.
  const editingColumnId = editingColumn?.colId ?? null;
  useEffect(() => {
    if (editingColumnId) {
      columnInputRef.current?.focus();
      columnInputRef.current?.select();
    }
  }, [editingColumnId]);

  // ============================================================================
  // FUNÇÃO CENTRAL PARA ATUALIZAR E SALVAR LOCALMENTE
  // ============================================================================
  const updateColumns = (
    newColsOrUpdater: Column[] | ((prev: Column[]) => Column[])
  ) => {
    setIsSaving(true);
    setWorkspace((prev) => {
      const pid = prev.activeProjectId;
      const newProjects = prev.projects.map((proj) => {
        if (proj.id !== pid) return proj;
        const newCols =
          typeof newColsOrUpdater === "function"
            ? newColsOrUpdater(proj.columns)
            : newColsOrUpdater;
        return { ...proj, columns: newCols };
      });
      const next = { ...prev, projects: newProjects };
      saveWorkspaceToLocal(next);
      scheduleSaveToCloud(next, isDarkRef.current);
      setTimeout(() => setIsSaving(false), 500);
      return next;
    });
  };

  const startEditBoardTitle = () => {
    setEditingColumn(null);
    boardTitleSnapshot.current = boardTitle;
    setIsEditingBoardTitle(true);
  };

  const commitBoardTitle = () => {
    const trimmed = boardTitle.trim() || DEFAULT_BOARD_TITLE;
    setBoardTitle(trimmed);
    setWorkspace((w) => {
      const pid = w.activeProjectId;
      const next: Workspace = {
        ...w,
        projects: w.projects.map((p) =>
          p.id === pid ? { ...p, boardTitle: trimmed, name: trimmed } : p
        ),
      };
      saveWorkspaceToLocal(next);
      scheduleSaveToCloud(next, isDarkRef.current);
      return next;
    });
    setIsEditingBoardTitle(false);
  };

  const cancelEditBoardTitle = () => {
    skipTitleBlurCommit.current = true;
    setBoardTitle(boardTitleSnapshot.current);
    setIsEditingBoardTitle(false);
  };

  const onBoardTitleBlur = () => {
    if (skipTitleBlurCommit.current) {
      skipTitleBlurCommit.current = false;
      return;
    }
    commitBoardTitle();
  };

  const switchActiveProject = (id: string) => {
    setWorkspace((w) => {
      const next = { ...w, activeProjectId: id };
      saveWorkspaceToLocal(next);
      scheduleSaveToCloud(next, isDarkRef.current);
      return next;
    });
  };

  const addProject = () => {
    const name = window.prompt("Nome do novo projeto", "Novo projeto");
    if (name === null) return;
    const trimmed = name.trim() || "Novo projeto";
    const p = createBlankProject();
    p.name = trimmed;
    p.boardTitle = trimmed;
    setWorkspace((w) => {
      const next = {
        projects: [...w.projects, p],
        activeProjectId: p.id,
      };
      saveWorkspaceToLocal(next);
      scheduleSaveToCloud(next, isDarkRef.current);
      return next;
    });
    setBoardTitle(trimmed);
  };

  const openEditColumn = (colId: string, title: string) => {
    setIsEditingBoardTitle(false);
    columnTitleSnapshot.current = title;
    setEditingColumn({ colId, title });
  };

  const commitEditColumn = () => {
    if (!editingColumn) return;
    const trimmed = editingColumn.title.trim() || "Sem título";
    const colId = editingColumn.colId;
    updateColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, title: trimmed } : c))
    );
    setEditingColumn(null);
  };

  const cancelEditColumn = () => {
    skipColumnBlurCommit.current = true;
    setEditingColumn(null);
  };

  const onColumnTitleBlur = () => {
    if (skipColumnBlurCommit.current) {
      skipColumnBlurCommit.current = false;
      return;
    }
    commitEditColumn();
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
    setEditingColumn(null);
    setEditingCard({ colId, card: { ...card } });
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

  // ============================================================================
  // DESATIVAR / REATIVAR (substitui o apagar — nada é removido de vez)
  // ============================================================================

  /** Devolve o item sem os campos de desativação, ou seja, ativo outra vez. */
  const reactivated = <T extends Disableable>(x: T): T => {
    const { disabled: _d, disabledAt: _a, ...rest } = x;
    return rest as T;
  };

  const disabledNow = <T extends Disableable>(x: T): T => ({
    ...x,
    disabled: true,
    disabledAt: new Date().toISOString(),
  });

  const commitWorkspace = (updater: (w: Workspace) => Workspace) => {
    setWorkspace((w) => {
      const next = updater(w);
      saveWorkspaceToLocal(next);
      scheduleSaveToCloud(next, isDarkRef.current);
      return next;
    });
  };

  const setCardDisabled = (colId: string, cardId: string, off: boolean) => {
    updateColumns((prev) =>
      prev.map((col) =>
        col.id === colId
          ? {
              ...col,
              cards: col.cards.map((c) =>
                c.id === cardId ? (off ? disabledNow(c) : reactivated(c)) : c
              ),
            }
          : col
      )
    );
  };

  const disableEditingCard = () => {
    if (!editingCard) return;
    setCardDisabled(editingCard.colId, editingCard.card.id, true);
    setEditingCard(null);
  };

  const setColumnDisabled = (colId: string, off: boolean) => {
    if (off && activeColumns.length <= 1) {
      window.alert("Tem de existir pelo menos um bloco ativo.");
      return;
    }
    updateColumns((prev) =>
      prev.map((col) =>
        col.id === colId ? (off ? disabledNow(col) : reactivated(col)) : col
      )
    );
    if (off && editingColumn?.colId === colId) setEditingColumn(null);
  };

  const disableActiveProject = () => {
    if (activeProjects.length <= 1) {
      window.alert("Tem de existir pelo menos um quadro ativo.");
      return;
    }
    commitWorkspace((w) => {
      const projects = w.projects.map((p) =>
        p.id === w.activeProjectId ? disabledNow(p) : p
      );
      const nextActive = projects.find(
        (p) => isActive(p) && p.id !== w.activeProjectId
      );
      return {
        projects,
        activeProjectId: nextActive?.id ?? w.activeProjectId,
      };
    });
  };

  const restoreProject = (id: string) => {
    commitWorkspace((w) => ({
      projects: w.projects.map((p) => (p.id === id ? reactivated(p) : p)),
      activeProjectId: id,
    }));
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

  const addNewColumn = () => {
    const newId = "col-" + Date.now() + "-" + crypto.randomUUID().slice(0, 8);
    updateColumns((prev) => [
      ...prev,
      {
        id: newId,
        title: "Nova coluna",
        cards: [],
      },
    ]);
    setTimeout(() => {
      openEditColumn(newId, "Nova coluna");
    }, 0);
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

  // Ainda a verificar a sessão: nada de piscar o quadro nem o login.
  if (auth.status === "a-verificar") return null;
  if (auth.status === "fora") return <LoginScreen theme={theme} />;

  if (!isLoaded) return null;

  return (
    <>
      <div
        className={`min-h-screen font-dm p-4 md:p-8 flex flex-col transition-colors duration-300 ${theme.bg} ${theme.text}`}
      >
        <div className="flex flex-wrap items-center gap-2 mb-6 w-full max-w-4xl">
          <span className={`text-xs font-semibold uppercase tracking-wide ${theme.textMuted}`}>
            Projeto
          </span>
          <select
            value={workspace.activeProjectId}
            onChange={(e) => switchActiveProject(e.target.value)}
            className={`rounded-xl px-3 py-2.5 text-sm border outline-none min-w-[200px] flex-1 max-w-md ${theme.inputBg} ${theme.cardBorder} ${theme.text}`}
            aria-label="Selecionar projeto"
          >
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addProject}
            className={`p-2.5 rounded-xl shrink-0 ${theme.btnSecondary}`}
            title="Novo projeto"
            aria-label="Novo projeto"
          >
            <FolderPlus size={18} />
          </button>
          <button
            type="button"
            onClick={disableActiveProject}
            className={`p-2.5 rounded-xl shrink-0 ${theme.btnSecondary}`}
            title="Desativar este quadro (fica no histórico)"
            aria-label="Desativar quadro atual"
          >
            <Archive size={18} />
          </button>

          {auth.status === "dentro" && (
            <div className="flex items-center gap-2 ml-auto min-w-0">
              <span
                className={`text-xs truncate max-w-[180px] ${theme.textMuted}`}
                title={auth.session.user.email ?? ""}
              >
                {auth.session.user.email}
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                className={`p-2.5 rounded-xl shrink-0 ${theme.btnSecondary}`}
                title="Sair"
                aria-label="Sair da conta"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <div className="group inline-flex items-center gap-1 max-w-full min-w-0">
              {isEditingBoardTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  onBlur={onBoardTitleBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitBoardTitle();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelEditBoardTitle();
                    }
                  }}
                  className={`text-2xl md:text-3xl font-semibold tracking-tight bg-transparent border-b-2 border-current outline-none min-w-0 w-full max-w-[min(100%,28rem)] ${theme.text}`}
                  aria-label="Título do quadro"
                />
              ) : (
                <>
                  <h1
                    className="text-2xl md:text-3xl font-semibold tracking-tight truncate min-w-0 cursor-pointer"
                    onClick={startEditBoardTitle}
                  >
                    {boardTitle}
                  </h1>
                  <button
                    type="button"
                    onClick={startEditBoardTitle}
                    className={`flex-shrink-0 p-1.5 rounded-lg transition-opacity opacity-0 group-hover:opacity-100 max-md:opacity-100 ${theme.textMuted}`}
                    aria-label="Editar título"
                  >
                    <Edit3 size={20} strokeWidth={1.75} />
                  </button>
                </>
              )}
            </div>
            <div
              className={`text-sm mt-1 font-medium flex items-center gap-2 ${theme.textMuted}`}
            >
              <span>Roadmap • vários projetos • fluxo ponta a ponta</span>
              <span
                className="flex items-center gap-1 text-[11px] ml-2 px-2 py-0.5 rounded-full border opacity-70"
                style={{ borderColor: "currentColor" }}
              >
                {isSaving ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Server size={10} />
                )}
                {!canStore
                  ? "Não está a guardar — navegação privada?"
                  : isSaving
                    ? "A guardar..."
                    : supabaseConfigured
                      ? "Local + nuvem (Supabase)"
                      : "Só neste browser"}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIsDark((prev) => {
                  const next = !prev;
                  writeLocal(THEME_KEY, next ? "dark" : "light");
                  isDarkRef.current = next;
                  scheduleSaveToCloud(workspaceRef.current, next);
                  return next;
                });
              }}
              className={`p-2.5 rounded-full transition-colors flex items-center justify-center shadow-sm ${theme.btnSecondary}`}
              aria-label={isDark ? "Tema claro" : "Tema escuro"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        {/* BOARD (COLUNAS) */}
        <div className="flex-1 flex gap-5 overflow-x-auto pb-8 items-start">
          {activeColumns.map((col) => (
            <div
              key={col.id}
              className={`flex-shrink-0 w-[320px] rounded-2xl border flex flex-col shadow-sm transition-colors duration-300 ${theme.cardBg} ${theme.cardBorder}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Header da Coluna */}
              {/* Cabeçalho: group/col em toda a faixa para hover e lixo sempre visível */}
              <div
                className={`group/col p-5 pb-3 flex justify-between items-start gap-2 rounded-t-2xl min-w-0`}
              >
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  {editingColumn?.colId === col.id ? (
                    <input
                      ref={columnInputRef}
                      type="text"
                      value={editingColumn.title}
                      onChange={(e) =>
                        setEditingColumn({
                          colId: col.id,
                          title: e.target.value,
                        })
                      }
                      onBlur={onColumnTitleBlur}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitEditColumn();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelEditColumn();
                        }
                      }}
                      className={`font-semibold text-[15px] bg-transparent border-b border-current outline-none min-w-0 flex-1 ${theme.text}`}
                      aria-label="Nome da coluna"
                    />
                  ) : (
                    <>
                      <h2
                        className="font-semibold text-[15px] truncate min-w-0 cursor-pointer"
                        onClick={() => openEditColumn(col.id, col.title)}
                      >
                        {col.title}
                      </h2>
                      <button
                        type="button"
                        onClick={() => openEditColumn(col.id, col.title)}
                        className={`flex-shrink-0 p-1 rounded-md transition-opacity opacity-0 group-hover/col:opacity-100 max-md:opacity-100 ${theme.textMuted}`}
                        aria-label="Editar nome da coluna"
                      >
                        <Edit3 size={16} strokeWidth={1.75} />
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setColumnDisabled(col.id, true)}
                    className={`p-1.5 rounded-lg shrink-0 transition-colors ${theme.textMuted} hover:${theme.inputBg}`}
                    aria-label="Desativar bloco"
                    title="Desativar este bloco (fica no histórico)"
                  >
                    <Archive size={16} />
                  </button>
                  <span
                    className={`text-[11px] py-0.5 px-2.5 rounded-full font-medium ${theme.inputBg} ${theme.textMuted}`}
                  >
                    {col.cards.filter(isActive).length}
                  </span>
                </div>
              </div>

              {/* Área dos Cartões */}
              <div className="p-3 pt-0 flex-1 overflow-y-auto flex flex-col gap-3 min-h-[150px]">
                {col.cards.filter(isActive).map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card, col.id)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-xl p-4 cursor-grab active:cursor-grabbing transition-all group relative border ${theme.cardBorder} ${theme.cardBg} ${theme.cardHover}`}
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-sm leading-tight pr-14">
                        {card.title}
                      </h3>
                      <div
                        className={`absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-opacity ${theme.textMuted}`}
                      >
                        <button
                          onClick={() => openEdit(col.id, card)}
                          className={`hover:${theme.text}`}
                          aria-label="Editar cartão"
                          title="Editar cartão"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => setCardDisabled(col.id, card.id, true)}
                          className={`hover:${theme.text}`}
                          aria-label="Desativar cartão"
                          title="Desativar este cartão (fica no histórico)"
                        >
                          <Archive size={16} />
                        </button>
                      </div>
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

          <button
            type="button"
            onClick={addNewColumn}
            className={`flex-shrink-0 w-[300px] min-h-[200px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 px-4 py-10 transition-colors ${theme.textMuted} border-current/25 hover:border-current/50 hover:${theme.inputBg} ${theme.text}`}
            aria-label="Adicionar nova coluna"
          >
            <LayoutGrid size={24} strokeWidth={1.5} />
            <span className="text-sm font-semibold text-center leading-snug">
              Nova coluna
            </span>
            <span className="text-[11px] opacity-70 text-center">
              Novo bloco de cartões
            </span>
          </button>
        </div>

        {/* ÁREA DE DESATIVADOS (histórico) */}
        <section className="mt-10 w-full">
          <button
            type="button"
            onClick={() => setShowArchive((v) => !v)}
            className={`flex items-center gap-2 text-sm font-semibold ${theme.textMuted} hover:${theme.text} transition-colors`}
            aria-expanded={showArchive}
            aria-controls="lista-desativados"
          >
            {showArchive ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
            <Archive size={16} />
            Desativados
            <span
              className={`text-[11px] py-0.5 px-2.5 rounded-full font-medium ${theme.inputBg}`}
            >
              {archive.total}
            </span>
          </button>

          {showArchive && (
            <div id="lista-desativados" className="mt-4 flex flex-col gap-2">
              {archive.total === 0 && (
                <p className={`text-sm ${theme.textMuted}`}>
                  Nada desativado por agora. O que desativares fica aqui e pode
                  ser reativado a qualquer momento.
                </p>
              )}

              {archive.projects.map((p) => (
                <ArchiveRow
                  key={"proj-" + p.id}
                  theme={theme}
                  kind="Quadro"
                  label={p.name}
                  detail={`${p.columns.filter(isActive).length} bloco(s)`}
                  at={p.disabledAt}
                  onRestore={() => restoreProject(p.id)}
                />
              ))}

              {archive.blocks.map((c) => (
                <ArchiveRow
                  key={"col-" + c.id}
                  theme={theme}
                  kind="Bloco"
                  label={c.title}
                  detail={`${c.cards.filter(isActive).length} cartão(ões)`}
                  at={c.disabledAt}
                  onRestore={() => setColumnDisabled(c.id, false)}
                />
              ))}

              {archive.cards.map(({ col, card }) => (
                <ArchiveRow
                  key={"card-" + card.id}
                  theme={theme}
                  kind="Cartão"
                  label={card.title}
                  detail={`em "${col.title}"`}
                  at={card.disabledAt}
                  onRestore={() => setCardDisabled(col.id, card.id, false)}
                />
              ))}
            </div>
          )}
        </section>

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
                {/* Desativar: reversível, por isso não pede confirmação */}
                <button
                  onClick={disableEditingCard}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-colors text-sm font-medium ${theme.textMuted} hover:${theme.inputBg}`}
                  title="Desativar este cartão (fica no histórico)"
                >
                  <Archive size={16} /> Desativar
                </button>

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

// ============================================================================
// LINHA DO HISTÓRICO DE DESATIVADOS
// ============================================================================

function formatDisabledAt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function ArchiveRow({
  theme,
  kind,
  label,
  detail,
  at,
  onRestore,
}: {
  theme: ThemeTokens;
  kind: "Quadro" | "Bloco" | "Cartão";
  label: string;
  detail: string;
  at?: string;
  onRestore: () => void;
}) {
  const when = formatDisabledAt(at);
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 opacity-75 hover:opacity-100 transition-opacity ${theme.cardBg} ${theme.cardBorder}`}
    >
      <span
        className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full shrink-0 ${theme.inputBg} ${theme.textMuted}`}
      >
        {kind}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate line-through decoration-1">
          {label}
        </p>
        <p className={`text-[11px] truncate ${theme.textMuted}`}>
          {detail}
          {when && ` • desativado em ${when}`}
        </p>
      </div>
      <button
        type="button"
        onClick={onRestore}
        className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-full shrink-0 ${theme.btnSecondary}`}
        title="Reativar"
      >
        <ArchiveRestore size={14} /> Reativar
      </button>
    </div>
  );
}
