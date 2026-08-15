"use client";

import { SidebarNav } from "@/components/layout/sidebar-nav";

/** Sidebar da área do aluno: tarefas e as próprias equipes (um aluno
 * pode integrar mais de uma — Q4). */
export function AlunoSidebar() {
  return (
    <SidebarNav
      items={[
        { label: "Minhas tarefas", href: "/aluno" },
        { label: "Minhas equipes", href: "/aluno/equipes" },
      ]}
    />
  );
}
