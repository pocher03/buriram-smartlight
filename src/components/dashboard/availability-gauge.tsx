// "use client";

// import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

// interface GaugeProps {
//   online: number;
//   offline: number;
//   total: number;
// }

// const COLORS = ["#1e8e3e", "#d93025"];

// export function AvailabilityGauge({ online, offline, total }: GaugeProps) {
//   const pct = total > 0 ? (online / total) * 100 : 0;
//   const data = [
//     { name: "ออนไลน์", value: online },
//     { name: "ออฟไลน์", value: offline },
//   ];
//   const isEmpty = total === 0 || data.every((d) => d.value === 0);

//   return (
//     <div className="bg-sf-2 dark:bg-dk-sf2 rounded-xl p-3 border border-bdr/60 dark:border-dk-bdr mb-3">
//       <div className="relative w-full" style={{ height: 120 }}>
//         <ResponsiveContainer width="100%" height={120}>
//           <PieChart>
//             <Pie
//               data={isEmpty ? [{ name: "ว่าง", value: 1 }] : data}
//               dataKey="value"
//               cx="50%"
//               cy="100%"
//               startAngle={180}
//               endAngle={0}
//               innerRadius={60}
//               outerRadius={88}
//               paddingAngle={isEmpty ? 0 : 2}
//               stroke="none"
//               isAnimationActive={false}
//             >
//               {(isEmpty ? ["#3a3f4b"] : COLORS).map((c, i) => (
//                 <Cell key={i} fill={c} />
//               ))}
//             </Pie>
//           </PieChart>
//         </ResponsiveContainer>
//         <div className="absolute left-0 right-0 bottom-0 flex flex-col items-center pointer-events-none">
//           <div className="text-3xl font-extrabold leading-none text-grn">
//             {isEmpty ? "--" : `${pct.toFixed(1)}%`}
//           </div>
//           <div className="text-[10px] text-t3 mt-1 font-medium">
//             อัตราความพร้อมใช้งาน
//           </div>
//         </div>
//       </div>

//       <div className="grid grid-cols-2 gap-1.5">
//         <div className="flex items-center gap-1.5 py-2 px-2 rounded-lg bg-grn-lt dark:bg-grn/10 border border-grn/15">
//           <span className="w-2 h-2 rounded-full bg-grn flex-shrink-0" />
//           <div className="min-w-0">
//             <div className="text-[8px] text-t3 leading-none">ออนไลน์</div>
//             <div className="text-sm font-bold text-grn tabular-nums leading-tight">
//               {online}
//             </div>
//           </div>
//         </div>
//         <div className="flex items-center gap-1.5 py-2 px-2 rounded-lg bg-red-lt dark:bg-red/10 border border-red/15">
//           <span className="w-2 h-2 rounded-full bg-red flex-shrink-0" />
//           <div className="min-w-0">
//             <div className="text-[8px] text-t3 leading-none">ออฟไลน์</div>
//             <div className="text-sm font-bold text-red tabular-nums leading-tight">
//               {offline}
//             </div>
//           </div>
//         </div>
//       </div>
//       <div className="text-center mt-2 pt-2 border-t border-bdr/60 dark:border-dk-bdr">
//         <span className="text-[10px] text-t3">โคมไฟทั้งหมด </span>
//         <strong className="text-xs text-t1 dark:text-dk-t1">{total}</strong>
//         <span className="text-[10px] text-t3"> ต้น</span>
//       </div>
//     </div>
//   );
// }