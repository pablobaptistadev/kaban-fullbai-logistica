export type Card = {
  id: string;
  title: string;
  content: string;
};

export type Column = {
  id: string;
  title: string;
  cards: Card[];
};
