export function MetricCard({ label, value, detail, tone = "blue" }) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-900",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-900",
    violet: "border-violet-100 bg-violet-50 text-violet-900",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-900",
    amber: "border-amber-100 bg-amber-50 text-amber-900",
  };

  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-black uppercase tracking-[0.14em] opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
      {detail ? <p className="mt-2 text-xs font-semibold opacity-70">{detail}</p> : null}
    </article>
  );
}
