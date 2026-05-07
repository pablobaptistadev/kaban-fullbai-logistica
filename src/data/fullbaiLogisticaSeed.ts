import type { Column, KanbanProject } from "../types/kanban";

/**
 * Quadro referência: fluxo Fullbai Logística (8 colunas, diagrama de arquitetura).
 */
export const FULLBAI_LOGISTICA_COLUMNS: Column[] = [
  {
    id: "fb-col-order",
    title: "Order Create",
    cards: [
      {
        id: "fb-o1",
        title: "Order Creation",
        content:
          "• Plataforma externa envia pedido\n• POST /api/v1/orders\n• Componente: API Gateway",
      },
      {
        id: "fb-o2",
        title: "Background Processing",
        content:
          "• Worker processa pedidos e clientes\n• Componente: Background Worker",
      },
      {
        id: "fb-o3",
        title: "Status: pending / consolidação",
        content:
          "• Multi-seller à espera de consolidação\n• Componente: Order Management",
      },
    ],
  },
  {
    id: "fb-col-seller",
    title: "SELLER PREP Products",
    cards: [
      {
        id: "fb-s1",
        title: "Seller Marks Ready",
        content:
          "• Vendedor marca itens prontos\n• POST /api/v1/seller/ready-products\n• Componente: Admin UI",
      },
      {
        id: "fb-s2",
        title: "POST Items Ready",
        content:
          "• Atualiza status pending → ready\n• POST /api/v1/ready-products\n• Componente: API Gateway",
      },
    ],
  },
  {
    id: "fb-col-picking",
    title: "OPERATOR PICKING",
    cards: [
      {
        id: "fb-p1",
        title: "Operator Scans Products",
        content:
          "• Operador bipa / serial\n• Componentes: Admin UI / mobile-prod-app",
      },
      {
        id: "fb-p2",
        title: "POST Scan",
        content:
          "• Status ready → delivered (à empresa)\n• POST /api/v1/delivery\n• Componente: API Gateway",
      },
      {
        id: "fb-p3",
        title: "Auto-propagation",
        content:
          "• Triggers internos de propagação do scan\n• Componente: Database Function",
      },
    ],
  },
  {
    id: "fb-col-consol",
    title: "CONSOLIDATION",
    cards: [
      {
        id: "fb-c1",
        title: "POST Consolidate",
        content:
          "• Regras de embalagem (volumétrico, etc.)\n• POST /api/v1/consolidate\n• Componente: API Gateway",
      },
      {
        id: "fb-c2",
        title: "Create Packages",
        content:
          "• Gera packages logísticos\n• Componente: Package Management",
      },
    ],
  },
  {
    id: "fb-col-manifest",
    title: "MANIFEST CREATION (PRESS)",
    cards: [
      {
        id: "fb-m1",
        title: "Admin Creates Cargo Manifest",
        content: "• Lista de packages no manifest\n• Componente: Admin UI",
      },
      {
        id: "fb-m2",
        title: "Set Provider",
        content:
          "• Provider internacional (ex.: ReCar / PRESS)\n• Componente: Manifest Management",
      },
      {
        id: "fb-m3",
        title: "Add Packages to Manifest",
        content:
          "• Vários packages no mesmo manifest\n• Componente: Manifest Management",
      },
    ],
  },
  {
    id: "fb-col-dispatch",
    title: "INTERNATIONAL DISPATCH (PRESS)",
    cards: [
      {
        id: "fb-d1",
        title: "Dispatch Button",
        content:
          "• Admin dispara envio internacional\n• POST /api/v1/admin/cargo-manifest...\n• Componente: Admin UI",
      },
      {
        id: "fb-d2",
        title: "manifest-orchestrator",
        content:
          "• Mensagens com dados do manifest\n• Componente: Orchestrator service",
      },
      {
        id: "fb-d3",
        title: "PRESS API Calls",
        content: "• Integração API externa PRESS\n• Componente: External Integration",
      },
      {
        id: "fb-d4",
        title: "Save Tracking",
        content:
          "• PRESS devolve tracking → gravar\n• Componente: Database",
      },
      {
        id: "fb-d5",
        title: "Update Status",
        content:
          "• Manifest → dispatched\n• Componente: Order Management",
      },
    ],
  },
  {
    id: "fb-col-transit",
    title: "IN TRANSIT (PRESS tracking)",
    cards: [
      {
        id: "fb-t1",
        title: "Flight / TR → AR",
        content:
          "• Etapas: recolha aeroporto, voos internacionais, etc.",
      },
      {
        id: "fb-t2",
        title: "PRESS Events",
        content:
          "• Webhook POST ou polling\n• POST /api/v1/webhook-exchange\n• Componente: Webhook Handler",
      },
      {
        id: "fb-t3",
        title: "Status Mapping",
        content:
          "• Ex.: 001_in_customs, 002_in_transit → internos\n• Componente: Status Mapper",
      },
    ],
  },
  {
    id: "fb-col-lastmile",
    title: "LAST MILE (Delivery)",
    cards: [
      {
        id: "fb-l1",
        title: "Handover Last Mile",
        content:
          "• Aduana e entrega ao motorista última milha",
      },
      {
        id: "fb-l2",
        title: "New tracking Number",
        content:
          "• Tracking courier local\n• Componente: Tracking Management",
      },
      {
        id: "fb-l3",
        title: "Order status: out_for_delivery",
        content: "• En route ao cliente\n• Componente: Order Management",
      },
      {
        id: "fb-l4",
        title: "Final Delivery",
        content:
          "• Webhook entrega final\n• POST /api/v1/webhook-delivery\n• Componente: Webhook Handler",
      },
    ],
  },
];

export function createFullbaiLogisticaProject(): KanbanProject {
  const id = crypto.randomUUID();
  return {
    id,
    name: "Fullbai Logística",
    boardTitle: "Fullbai Logística",
    columns: FULLBAI_LOGISTICA_COLUMNS.map((col) => ({
      ...col,
      cards: col.cards.map((c) => ({ ...c })),
    })),
  };
}
