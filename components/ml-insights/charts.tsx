'use client';

import type { ReactNode } from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

export const percent = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'Not evaluated';
export const number = (value: number) => value.toLocaleString('en-US');

export function InsightCard({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
  return <section className="insight-card"><h2>{title}</h2>{detail && <p className="insight-detail">{detail}</p>}{children}</section>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="insight-empty">{children}</div>;
}

export function ValueBars({ rows, label, color = '#3684f5', percentage = false }: { rows: { name: string; value: number }[]; label: string; color?: string; percentage?: boolean }) {
  if (!rows.length) return <Empty>No recorded data is available for this chart.</Empty>;
  return <><div className="insight-chart" role="group" aria-label={label} style={{ height: Math.max(220, rows.length * 34) }}>
    <ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout="vertical" margin={{ left: 0, right: 16, bottom: 12 }} accessibilityLayer>
      <CartesianGrid horizontal={false} stroke="#e7eef8" /><XAxis type="number" domain={percentage ? [0, 1] : [0, 'auto']} tickFormatter={percentage ? percent : undefined} tick={{ fontSize: 11 }} />
      <YAxis type="category" dataKey="name" width={135} tick={{ fontSize: 11 }} tickFormatter={value => String(value).length > 22 ? `${String(value).slice(0, 21)}…` : String(value)} interval={0} />
      <Tooltip formatter={value => percentage ? percent(Number(value)) : number(Number(value))} /><Bar dataKey="value" name={label} fill={color} radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false} />
    </BarChart></ResponsiveContainer>
  </div><details className="insight-values"><summary>Read chart values</summary><dl>{rows.map(row => <div key={row.name}><dt>{row.name}</dt><dd>{percentage ? percent(row.value) : number(row.value)}</dd></div>)}</dl></details></>;
}

export function LearningCurve({ rows }: { rows: { train_size: number; train_f1: number; validation_f1: number }[] }) {
  return <><div className="insight-chart" style={{ height: 300 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={rows} accessibilityLayer margin={{ right: 16, bottom: 10 }}>
    <CartesianGrid stroke="#e7eef8" /><XAxis dataKey="train_size" tick={{ fontSize: 11 }} /><YAxis domain={[0, 1]} tickFormatter={percent} width={50} /><Tooltip formatter={value => percent(Number(value))} /><Legend />
    <Line dataKey="train_f1" name="Training macro F1" stroke="#3684f5" isAnimationActive={false} /><Line dataKey="validation_f1" name="Validation macro F1" stroke="#13a38b" isAnimationActive={false} />
  </LineChart></ResponsiveContainer></div><details className="insight-values"><summary>Read curve values</summary>{rows.map(row => <p key={row.train_size}>{number(row.train_size)} rows: training {percent(row.train_f1)}, validation {percent(row.validation_f1)}</p>)}</details></>;
}

export function DonutBreakdown({ rows, label }: { rows: { name: string; value: number; color?: string }[]; label: string }) {
  if (!rows.length) return <Empty>No feature category breakdown is available.</Empty>;
  const total = rows.reduce((s, r) => s + r.value, 0);
  const colors = ['#0d9488', '#3684f5', '#8b5cf6', '#f59e0b', '#ec4899', '#64748b'];
  return (
    <div className="donut-wrap flex flex-col items-center">
      <div className="w-full flex flex-col gap-2 p-1" role="group" aria-label={label}>
        {rows.map((row, i) => {
          const pct = total > 0 ? ((row.value / total) * 100).toFixed(1) : '0';
          const bg = row.color || colors[i % colors.length];
          return (
            <div key={row.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: bg }} />
                <span className="font-medium text-slate-800">{row.name}</span>
              </div>
              <div className="text-right">
                <strong className="text-slate-900">{number(row.value)}</strong>
                <span className="text-slate-500 ml-1.5">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
