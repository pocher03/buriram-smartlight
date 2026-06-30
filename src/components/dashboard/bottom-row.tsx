"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { EnergyPeriod, EnergySeries, FaultArea } from "@/lib/types";
import { calcSavings, display } from "@/lib/null-safe";


interface BottomRowProps {
  energy: EnergySeries;
  period: string;
  onPeriodChange: (p: EnergyPeriod) => void;
  faultAreas: FaultArea[];
}

export function BottomRow({ energy, faultAreas }: BottomRowProps) {
  const savings = calcSavings(energy.totalSave);
  const moneyFmt = savings.money === "--" ? "--" : Number(savings.money).toLocaleString("th-TH", { maximumFractionDigits: 0 });
  const co2Fmt = savings.co2 === "--" ? "--" : Number(savings.co2).toLocaleString("th-TH", { maximumFractionDigits: 0 });
  const [chartOpen, setChartOpen] = useState(false);

  return (
    <>
      <div className="flex-shrink-0 bg-sf dark:bg-dk-sf border-t border-bdr dark:border-dk-bdr flex flex-col md:flex-row overflow-hidden md:h-[210px]">
        {/* Energy chart */}
        <div className="btm-sec flex flex-col p-3 h-[240px] md:h-auto md:min-w-0 md:[flex:1.8]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="ms ms-f text-yel" style={{ fontSize: 15 }}>bolt</span>
              <span className="text-[10px] font-bold text-t2 dark:text-dk-t2 uppercase tracking-wider">
                เปรียบเทียบการใช้พลังงาน (kWh)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Legend color="#1a73e8" label="ปีนี้" />
              <Legend color="rgba(30,142,62,.7)" label="ปีก่อน" />
              <span className="text-[9px] text-t3 ml-1">รายเดือน</span>
              <button
                onClick={() => setChartOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sf-3 dark:bg-dk-sf2 border border-bdr dark:border-dk-bdr text-t2 dark:text-dk-t2 hover:text-blu hover:border-blu/40 transition ml-1"
                title="ขยายดูรายละเอียด"
              >
                <span className="ms" style={{ fontSize: 14 }}>open_in_full</span>
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <EnergyChart energy={energy} />
          </div>
        </div>

        {/* Savings */}
        <div className="btm-sec flex flex-col justify-center gap-2 p-3 border-t border-bdr/50 dark:border-dk-bdr md:border-t-0 md:min-w-0 md:[flex:0.82]">
          <div className="text-[10px] font-bold text-t2 dark:text-dk-t2 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <span className="ms ms-f" style={{ fontSize: 14, color: "#34a853" }}>savings</span>
            ผลประหยัด
          </div>
          <div className="bg-grn-lt dark:bg-grn/10 rounded-xl p-2.5 border border-grn/20">
            <div className="text-[9px] text-grn font-medium mb-0.5">💰 เงินประหยัดสะสม</div>
            <div className="text-xl font-bold text-grn leading-none">
              {moneyFmt} <span className="text-xs font-normal">บาท</span>
            </div>
            <div className="text-[9px] text-t3 mt-1">kWh × 4.5 ฿</div>
          </div>
          <div className="bg-blu-lt dark:bg-blu/10 rounded-xl p-2.5 border border-blu/20">
            <div className="text-[9px] text-blu font-medium mb-0.5">🌿 ลดคาร์บอน CO₂</div>
            <div className="text-xl font-bold text-blu leading-none">
              {co2Fmt} <span className="text-xs font-normal">kg</span>
            </div>
            <div className="text-[9px] text-t3 mt-1">kWh × 0.5 kg</div>
          </div>
        </div>

        {/* Top fault */}
        <div className="btm-sec flex flex-col p-3 border-t border-bdr/50 dark:border-dk-bdr md:border-t-0 md:min-w-0 md:[flex:0.78]">
          <div className="text-[10px] font-bold text-t2 dark:text-dk-t2 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <span className="ms ms-f text-red" style={{ fontSize: 14 }}>report_problem</span>
            โซนปัญหาสูงสุด
          </div>
          <div className="space-y-2 flex-1">
            {faultAreas.length === 0 ? (
              <div className="text-[11px] text-t3">ไม่พบข้อมูล</div>
            ) : (
              faultAreas.map((f, i) => {
                const max = faultAreas[0].count || 1;
                const color = i === 0 ? "bg-red" : i === 1 ? "bg-yel" : "bg-t3";
                const textColor = i === 0 ? "text-red" : i === 1 ? "text-yel" : "text-t2 dark:text-dk-t2";
                const badgeBg = i === 0 ? "bg-red-lt dark:bg-red/15 text-red" : i === 1 ? "bg-yel-lt dark:bg-yel/15 text-yel" : "bg-sf-3 dark:bg-dk-sf2 text-t3";
                return (
                  <div key={f.name}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-4 h-4 rounded-md text-[9px] font-bold flex items-center justify-center flex-shrink-0 ${badgeBg}`}>
                          {i + 1}
                        </span>
                        <span className="text-[11px] font-medium text-t1 dark:text-dk-t1 truncate">{f.name}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${textColor}`}>{f.count} ครั้ง</span>
                    </div>
                    <div className="pbar">
                      <div className={`pfill ${color}`} style={{ width: `${(f.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Intelligent */}
        <div className="flex flex-col p-3 border-t border-bdr/50 dark:border-dk-bdr md:border-t-0 md:min-w-0 md:[flex:0.95]">
          <div className="text-[10px] font-bold text-t2 dark:text-dk-t2 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <span className="ms ms-f text-blu" style={{ fontSize: 14 }}>auto_awesome</span>
            Intelligent
          </div>
          <div className="flex-1 bg-blu-lt dark:bg-blu/10 rounded-xl p-3 border border-blu/20 flex flex-col justify-between">
            <div className="flex gap-2">
              <span className="ms ms-f text-blu flex-shrink-0 mt-0.5" style={{ fontSize: 22 }}>auto_awesome</span>
              <p className="text-[11px] text-t2 dark:text-dk-t2 leading-relaxed">
                <strong className="text-t1 dark:text-dk-t1">วิเคราะห์:</strong> ประหยัดพลังงานได้{" "}
                <span className="text-grn font-semibold">{display(energy.totalSave, " kWh")}</span>{" "}
                เมื่อเทียบกับปีก่อน ระบบทำงานเสถียร
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-blu/15 dark:border-blu/20 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-t2 dark:text-dk-t2">
                <span className="ms ms-f text-grn" style={{ fontSize: 13 }}>check_circle</span>
                ไม่พบการแจ้งเตือนรุนแรงในช่วงล่าสุด
              </div>
              {faultAreas[0] && (
                <div className="flex items-center gap-1.5 text-[10px] text-t2 dark:text-dk-t2">
                  <span className="ms ms-f text-yel" style={{ fontSize: 13 }}>warning</span>
                  แนะนำตรวจสอบ{faultAreas[0].name} ({faultAreas[0].count} ครั้ง)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sheet — ขยายกราฟพลังงาน */}
      {chartOpen && (
        <div
          className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-black/50"
          onClick={() => setChartOpen(false)}
        >
          <div
            className="sheet-in w-full md:max-w-4xl bg-sf dark:bg-dk-sf rounded-t-2xl md:rounded-2xl shadow-g3 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-bdr dark:border-dk-bdr flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="ms ms-f text-yel" style={{ fontSize: 18 }}>bolt</span>
                <span className="text-sm font-bold text-t1 dark:text-dk-t1">รายละเอียดการใช้พลังงาน (kWh)</span>
              </div>
              <button
                onClick={() => setChartOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-t3 hover:bg-sf-3 dark:hover:bg-dk-sf2 transition"
              >
                <span className="ms" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* กราฟขนาดใหญ่ */}
              <div className="h-[260px]">
                <EnergyChart energy={energy} />
              </div>

              {/* สรุปยอดรวม */}
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard
                  icon="bolt" iconColor="text-yel"
                  label="พลังงานรวมปีนี้"
                  value={energy.points.reduce((s, p) => s + (p.current ?? 0), 0).toLocaleString("th-TH", { maximumFractionDigits: 1 })}
                  unit="kWh" bg="bg-yel-lt dark:bg-yel/10" border="border-yel/20"
                />
                <SummaryCard
                  icon="savings" iconColor="text-grn"
                  label="พลังงานประหยัดได้"
                  value={display(energy.totalSave != null ? Math.round(energy.totalSave) : null)}
                  unit="kWh" bg="bg-grn-lt dark:bg-grn/10" border="border-grn/20"
                />
                <SummaryCard
                  icon="co2" iconColor="text-blu"
                  label="ลด CO₂"
                  value={energy.totalSave != null
                    ? (energy.totalSave * 0.5).toLocaleString("th-TH", { maximumFractionDigits: 0 })
                    : "--"}
                  unit="kg" bg="bg-blu-lt dark:bg-blu/10" border="border-blu/20"
                />
              </div>

              {/* ตารางรายเดือน */}
              <div>
                <div className="text-[10px] font-bold text-t2 dark:text-dk-t2 uppercase tracking-wider mb-2">
                  ตารางข้อมูลรายเดือน
                </div>
                <div className="rounded-xl border border-bdr dark:border-dk-bdr overflow-hidden">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-sf-3 dark:bg-dk-sf2">
                        <th className="text-left px-3 py-2 text-t2 dark:text-dk-t2 font-semibold">เดือน</th>
                        <th className="text-right px-3 py-2 text-blu font-semibold">ปีนี้ (kWh)</th>
                        <th className="text-right px-3 py-2 text-grn font-semibold">ปีก่อน (kWh)</th>
                        <th className="text-right px-3 py-2 text-t2 dark:text-dk-t2 font-semibold">ผลต่าง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {energy.points.map((p, i) => {
                        const diff = (p.current ?? 0) - (p.previous ?? 0);
                        const isGood = diff <= 0;
                        return (
                          <tr key={i} className="border-t border-bdr/50 dark:border-dk-bdr hover:bg-sf-2 dark:hover:bg-dk-sf2 transition">
                            <td className="px-3 py-2 font-medium text-t1 dark:text-dk-t1">{p.label}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-blu font-semibold">
                              {p.current != null ? p.current.toLocaleString("th-TH", { maximumFractionDigits: 1 }) : "--"}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-grn">
                              {p.previous != null ? p.previous.toLocaleString("th-TH", { maximumFractionDigits: 1 }) : "--"}
                            </td>
                            <td className={`px-3 py-2 text-right tabular-nums font-semibold ${isGood ? "text-grn" : "text-red"}`}>
                              {p.current != null && p.previous != null
                                ? `${isGood ? "▼" : "▲"} ${Math.abs(diff).toLocaleString("th-TH", { maximumFractionDigits: 1 })}`
                                : "--"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryCard({ icon, iconColor, label, value, unit, bg, border }: {
  icon: string; iconColor: string; label: string; value: string; unit: string; bg: string; border: string;
}) {
  return (
    <div className={`rounded-xl p-3 border ${bg} ${border}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`ms ms-f ${iconColor}`} style={{ fontSize: 14 }}>{icon}</span>
        <span className="text-[9px] text-t3 font-medium">{label}</span>
      </div>
      <div className={`text-lg font-bold ${iconColor} leading-none`}>
        {value} <span className="text-xs font-normal text-t3">{unit}</span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block w-2.5 h-2.5 rounded-[3px] flex-shrink-0" style={{ background: color }} />
      <span className="text-[9px] text-t3 font-medium">{label}</span>
    </div>
  );
}

function EnergyChart({ energy }: { energy: EnergySeries }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  const axis = dark ? "#9aa0a6" : "#5f6368";
  const grid = dark ? "#2e3340" : "#e0e0e0";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={energy.points} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCurr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4fc3f7" stopOpacity={1} />
            <stop offset="100%" stopColor="#1a73e8" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#69f0ae" stopOpacity={1} />
            <stop offset="100%" stopColor="#1e8e3e" stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: axis }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 9, fill: axis }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={{
            background: dark ? "#1e2128" : "#fff",
            border: `1px solid ${grid}`,
            borderRadius: 10,
            fontSize: 11,
          }}
          labelStyle={{ color: axis }}
        />
        <Bar dataKey="previous" name="ปีก่อน" fill="url(#gradPrev)" radius={[3, 3, 0, 0]} maxBarSize={14} />
        <Bar dataKey="current" name="ปีนี้" fill="url(#gradCurr)" radius={[3, 3, 0, 0]} maxBarSize={14} />
        <Line dataKey="carbon" name="คาร์บอนเครดิต" type="monotone" stroke="#34a853" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
