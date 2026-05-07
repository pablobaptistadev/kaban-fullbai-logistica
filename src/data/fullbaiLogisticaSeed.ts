import type { Column, KanbanProject } from "../types/kanban";

/**
 * Quadro referência Fullbai Logística — alinhado ao diagrama de 8 colunas (PREIS / PREIS API).
 */
export const FULLBAI_LOGISTICA_COLUMNS: Column[] = [
  {
    id: "fb-col-order",
    title: "Order Created",
    cards: [
      {
        id: "fb-o1",
        title: "Order Creation",
        content:
          "• Database trigger POST order data…\n• POST Deploy Webhook\n• Componente: API Gateway",
      },
      {
        id: "fb-o2",
        title: "Background Processing",
        content:
          "• Worker scans order database for…\n• Componente: Background Worker",
      },
      {
        id: "fb-o3",
        title: "Status pending or pending_arrival",
        content:
          "• Webhook for status wait for…\n• Componente: Order Management",
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
          "• Seller clicks \"Mark as ready for…\"\n• Admin tool outputting print labels\n• Componente: Admin UI",
      },
      {
        id: "fb-s2",
        title: "POST Ready Status",
        content:
          "• Status changes from pending → ready\n• POST tracking number to order database…\n• Componente: API Gateway",
      },
    ],
  },
  {
    id: "fb-col-measure",
    title: "MEASURING/RECEIVE",
    cards: [
      {
        id: "fb-p1",
        title: "Operator Scans Products",
        content:
          "• Operator scans bar code to mark as…\n• Admin / Worker Interface\n• Componente: Admin UI",
      },
      {
        id: "fb-p2",
        title: "POST Flow",
        content:
          "• Status ready → received (entry point…)\n• POST Weight / Dimension\n• Componente: API Gateway",
      },
      {
        id: "fb-p3",
        title: "Auto-propagate",
        content:
          "• Trigger gets triggered when all…\n• Componente: Database Function",
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
          "• Apply Paraguay Customs rules (if any…)\n• POST consolidated parcel data\n• Componente: API Gateway",
      },
      {
        id: "fb-c2",
        title: "Create Packages",
        content:
          "• Generate shipping label / package per…\n• Componente: Package Management",
      },
    ],
  },
  {
    id: "fb-col-manifest",
    title: "MANIFEST CREATION (PREIS API)",
    cards: [
      {
        id: "fb-m1",
        title: "Admin Creates Cargo Manifest",
        content:
          "• Create manifest with status \"draft\"\n• Admin manages manifest\n• Componente: Admin UI",
      },
      {
        id: "fb-m2",
        title: "Set Airwaybill",
        content:
          "• Set international airwaybill for the cargo…\n• Componente: Manifest Management",
      },
      {
        id: "fb-m3",
        title: "Add Packages to Manifest",
        content:
          "• Admin confirms packages in manifest\n• Componente: Manifest Management",
      },
    ],
  },
  {
    id: "fb-col-dispatch",
    title: "INTERNATIONAL DISPATCH (PREIS)",
    cards: [
      {
        id: "fb-d1",
        title: "Dispatch Batch",
        content:
          "• Trigger dispatch process\n• POST digital manifest / copy manifest…\n• Componente: Admin UI",
      },
      {
        id: "fb-d2",
        title: "Manifest with status",
        content:
          "• Documentations with manifest list…\n• Componente: Orchestrator Service",
      },
      {
        id: "fb-d3",
        title: "PREIS API Calls",
        content:
          "• Many-to-one manifest → …\n• PREIS API\n• Componente: External Integration",
      },
      {
        id: "fb-d4",
        title: "Scan Tracking",
        content:
          "• PREIS returns tracking / security code…\n• Componente: Database",
      },
      {
        id: "fb-d5",
        title: "Update Status",
        content:
          "• Many-to-one manifest → dispatched…\n• Componente: Order Management",
      },
    ],
  },
  {
    id: "fb-col-transit",
    title: "IN TRANSIT (PREIS Tracking)",
    cards: [
      {
        id: "fb-t1",
        title: "Take Flight",
        content:
          "• Airport pick up / manifest loading…\n• Componente: Logistics",
      },
      {
        id: "fb-t2",
        title: "PREIS Events",
        content:
          "• Webhook / Poller getting every status…\n• POST status to order database\n• Componente: Webhook Handler",
      },
      {
        id: "fb-t3",
        title: "Status Mapping",
        content:
          "• 201 → in_transit, 202 → cleared_customs…\n• Componente: Status Mapper",
      },
    ],
  },
  {
    id: "fb-col-lastmile",
    title: "LAST MILE (Local Carrier)",
    cards: [
      {
        id: "fb-l1",
        title: "Handover Last Mile",
        content:
          "• Webhook triggers Manifest Out…\n• Webhook Poller",
      },
      {
        id: "fb-l2",
        title: "New Tracking Number",
        content:
          "• Local log return new tracking…\n• Componente: Tracking Management",
      },
      {
        id: "fb-l3",
        title: "out_for_delivery",
        content:
          "• Package in route to customer home\n• Componente: Order Management",
      },
      {
        id: "fb-l4",
        title: "Final Delivery",
        content:
          "• Webhook triggers final status…\n• POST deploy webhook / client flag\n• Componente: Webhook Handler",
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
