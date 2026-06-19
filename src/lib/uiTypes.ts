export type DrawerMode = 'create' | 'edit';

export type Toast = { id: number; tone: 'success' | 'error'; message: string };

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export type ConfirmRequest = ConfirmOptions & {
  id: number;
  resolve: (confirmed: boolean) => void;
};
