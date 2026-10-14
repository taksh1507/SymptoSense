'use client';
import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}><Dialog.Portal><Dialog.Overlay className="modal-overlay"><Dialog.Content className="modal-panel" aria-describedby={undefined}><Dialog.Title asChild><h2>{title}</h2></Dialog.Title>{children}</Dialog.Content></Dialog.Overlay></Dialog.Portal></Dialog.Root>;
}
