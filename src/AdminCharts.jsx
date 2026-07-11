// Gráficos del dashboard admin, en archivo aparte a propósito:
// recharts pesa ~250 KB y solo lo usa el panel admin. Al cargarlo con
// lazy import, los CLIENTES no lo descargan al abrir la calculadora.
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CLR = ["#18548a", "#f59e0b", "#22c55e", "#94a3b8"];

export default function AdminCharts({ last7, sdData }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", gap:16, marginBottom:24 }}>
      <div style={{ background:"white", borderRadius:16, padding:20, border:"1px solid #eef2f7" }}>
        <p style={{ fontWeight:700, fontSize:13, color:"#334155", marginBottom:12 }}>Últimos 7 días</p>
        <ResponsiveContainer width="100%" height={140}><BarChart data={last7}><XAxis dataKey="day" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="#18548a" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
      </div>
      <div style={{ background:"white", borderRadius:16, padding:20, border:"1px solid #eef2f7" }}>
        <p style={{ fontWeight:700, fontSize:13, color:"#334155", marginBottom:12 }}>Por estado</p>
        {sdData.length > 0
          ? <ResponsiveContainer width="100%" height={140}><PieChart><Pie data={sdData} cx="50%" cy="50%" innerRadius={30} outerRadius={58} dataKey="value" label={({name,value})=>`${name}:${value}`} labelLine={false} fontSize={10}>{sdData.map((_,i)=><Cell key={i} fill={CLR[i%CLR.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>
          : <div style={{ height:140, display:"flex", alignItems:"center", justifyContent:"center", color:"#94a3b8", fontSize:13 }}>Sin datos</div>}
      </div>
    </div>
  );
}
