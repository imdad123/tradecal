 "use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, Plus, X, TrendingUp, TrendingDown, CalendarDays, BookOpen, LogOut, Download, Upload, Trash2, Pencil, Wallet, Target, Activity } from "lucide-react";

type Trade = {
  id: string; user_id?: string; trade_date: string; symbol: string; side: "Buy"|"Sell";
  entry_price: number|null; exit_price: number|null; stop_loss: number|null; take_profit: number|null;
  lot_size: number|null; pnl: number; strategy: string; notes: string; created_at?: string;
};
const blank = (date: string): Omit<Trade,"id"> => ({
  trade_date: date, symbol:"EURUSD", side:"Buy", entry_price:null, exit_price:null,
  stop_loss:null, take_profit:null, lot_size:null, pnl:0, strategy:"SMC", notes:""
});
const fmt = (n:number) => `${n < 0 ? "-$" : "$"}${Math.abs(n).toFixed(2)}`;
const dateKey = (d:Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const monthLabel = (d:Date) => d.toLocaleDateString("en-US",{month:"long",year:"numeric"});

export default function Home() {
  const [user,setUser] = useState<any>(null);
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [authMode,setAuthMode] = useState<"signin"|"signup">("signin");
  const [authBusy,setAuthBusy] = useState(false);
  const [authMessage,setAuthMessage] = useState("");
  const [trades,setTrades] = useState<Trade[]>([]);
  const [month,setMonth] = useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));
  const [selectedDate,setSelectedDate] = useState(dateKey(new Date()));
  const [editing,setEditing] = useState<Trade|null>(null);
  const [draft,setDraft] = useState<any>(blank(dateKey(new Date())));
  const [modal,setModal] = useState(false);
  const [view,setView] = useState<"calendar"|"journal">("calendar");
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("");

  useEffect(()=>{
    if(!supabase) return;
    supabase.auth.getSession().then(({data})=>setUser(data.session?.user ?? null));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user ?? null));
    return ()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{ if(user) loadTrades(); else setTrades([]); },[user]);
  async function loadTrades(){
    if(!supabase || !user) return;
    setBusy(true);
    const {data,error}=await supabase.from("trades").select("*").order("trade_date",{ascending:false});
    if(error) setNotice(error.message); else setTrades((data||[]) as Trade[]);
    setBusy(false);
  }
  async function authenticate(e:React.FormEvent){
    e.preventDefault(); if(!supabase) return;
    setAuthBusy(true); setAuthMessage("");
    const result=authMode==="signup"
      ? await supabase.auth.signUp({email,password})
      : await supabase.auth.signInWithPassword({email,password});
    if(result.error) setAuthMessage(result.error.message);
    else if(authMode==="signup" && !result.data.session) setAuthMessage("Account created. Check your email to confirm, then sign in.");
    setAuthBusy(false);
  }
  async function logout(){ await supabase?.auth.signOut(); setUser(null); }
  function openNew(date:string){ setEditing(null); setDraft(blank(date)); setSelectedDate(date); setModal(true); }
  function openEdit(t:Trade){ setEditing(t); setDraft({...t}); setSelectedDate(t.trade_date); setModal(true); }
  async function saveTrade(e:React.FormEvent){
    e.preventDefault(); if(!supabase || !user) return;
    const payload={...draft,user_id:user.id,pnl:Number(draft.pnl)||0,
      entry_price:draft.entry_price===""?null:Number(draft.entry_price),
      exit_price:draft.exit_price===""?null:Number(draft.exit_price),
      stop_loss:draft.stop_loss===""?null:Number(draft.stop_loss),
      take_profit:draft.take_profit===""?null:Number(draft.take_profit),
      lot_size:draft.lot_size===""?null:Number(draft.lot_size)};
    setBusy(true);
    const result=editing
      ? await supabase.from("trades").update(payload).eq("id",editing.id).select().single()
      : await supabase.from("trades").insert(payload).select().single();
    if(result.error) setNotice(result.error.message);
    else { setTrades(prev=>editing?prev.map(t=>t.id===editing.id?result.data as Trade:t):[result.data as Trade,...prev]); setModal(false); setNotice("Trade saved."); }
    setBusy(false);
  }
  async function deleteTrade(t:Trade){
    if(!supabase || !confirm("Delete this trade?")) return;
    const {error}=await supabase.from("trades").delete().eq("id",t.id);
    if(error) setNotice(error.message); else {setTrades(p=>p.filter(x=>x.id!==t.id));setNotice("Trade deleted.");}
  }
  const monthTrades=useMemo(()=>trades.filter(t=>t.trade_date.startsWith(`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}`)),[trades,month]);
  const monthPnl=monthTrades.reduce((s,t)=>s+Number(t.pnl||0),0);
  const wins=monthTrades.filter(t=>Number(t.pnl)>0).length;
  const winRate=monthTrades.length?wins/monthTrades.length*100:0;
  const totalPnl=trades.reduce((s,t)=>s+Number(t.pnl||0),0);
  const selectedTrades=trades.filter(t=>t.trade_date===selectedDate);
  const cells=useMemo(()=>{
    const first=new Date(month.getFullYear(),month.getMonth(),1);
    const start=(first.getDay()+6)%7;
    const days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
    return [...Array(start).fill(null),...Array.from({length:days},(_,i)=>new Date(month.getFullYear(),month.getMonth(),i+1))];
  },[month]);
  const byDate=useMemo(()=>{const m=new Map<string,Trade[]>(); monthTrades.forEach(t=>m.set(t.trade_date,[...(m.get(t.trade_date)||[]),t]));return m;},[monthTrades]);
  function exportCsv(){
    const headers=["Date","Symbol","Side","Entry","Exit","Stop Loss","Take Profit","Lot Size","PnL","Strategy","Notes"];
    const rows=trades.map(t=>[t.trade_date,t.symbol,t.side,t.entry_price,t.exit_price,t.stop_loss,t.take_profit,t.lot_size,t.pnl,t.strategy,t.notes]);
    const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="tradecal-journal.csv";a.click();URL.revokeObjectURL(a.href);
  }
  async function importCsv(file?:File){
    if(!file || !supabase || !user) return;
    const text=await file.text(); const lines=text.split(/\r?\n/).filter(Boolean);
    const rows=lines.slice(1).map(line=>line.split(",").map(x=>x.replace(/^"|"$/g,"").replaceAll('""','"')));
    const payload=rows.filter(r=>r.length>=9 && /^\d{4}-\d{2}-\d{2}$/.test(r[0])).map(r=>({
      user_id:user.id,trade_date:r[0],symbol:r[1]||"EURUSD",side:r[2]==="Sell"?"Sell":"Buy",
      entry_price:r[3]?Number(r[3]):null,exit_price:r[4]?Number(r[4]):null,
      stop_loss:r[5]?Number(r[5]):null,take_profit:r[6]?Number(r[6]):null,
      lot_size:r[7]?Number(r[7]):null,pnl:Number(r[8])||0,strategy:r[9]||"",notes:r[10]||""
    }));
    if(!payload.length){setNotice("No valid rows found. Use the exported CSV format.");return;}
    const {error}=await supabase.from("trades").insert(payload);
    if(error)setNotice(error.message);else{setNotice(`${payload.length} trades imported.`);loadTrades();}
  }

  if(!hasSupabaseConfig) return <main className="setup"><div className="setup-card"><div className="brand-mark">TC</div><p className="eyebrow">TRADECAL · SETUP REQUIRED</p><h1>Connect your free database</h1><p>Before deploying, create a free Supabase project, run the SQL in <b>supabase/schema.sql</b>, then add the two environment variables from <b>.env.example</b> to Vercel.</p><a className="primary-link" href="https://supabase.com/dashboard" target="_blank">Create Supabase project ↗</a><p className="muted">Follow the included DEPLOY.md guide. Your trades will be stored in your own database.</p></div></main>;
  if(!user) return <main className="auth-wrap"><div className="auth-card"><div className="brand-mark">TC</div><p className="eyebrow">YOUR PERSONAL TRADING JOURNAL</p><h1>TradeCal</h1><p className="muted">A clear view of every trading day.</p><form onSubmit={authenticate} className="auth-form"><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters"/></label><button className="primary" disabled={authBusy}>{authBusy?"Please wait…":authMode==="signin"?"Sign in":"Create account"}</button></form>{authMessage&&<p className="notice">{authMessage}</p>}<button className="text-button" onClick={()=>setAuthMode(authMode==="signin"?"signup":"signin")}>{authMode==="signin"?"New here? Create an account":"Already registered? Sign in"}</button></div></main>;

  return <main className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark">TC</div><span>TradeCal</span></div><div className="side-label">WORKSPACE</div><button className={`nav-item ${view==="calendar"?"active":""}`} onClick={()=>setView("calendar")}><CalendarDays size={18}/> Calendar</button><button className={`nav-item ${view==="journal"?"active":""}`} onClick={()=>setView("journal")}><BookOpen size={18}/> Trade journal</button><div className="side-bottom"><div className="avatar">{(user.email||"T")[0].toUpperCase()}</div><div className="user-info"><b>{user.email}</b><span>Personal workspace</span></div><button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={17}/></button></div></aside>
    <section className="main-area">
      <header className="topbar"><div><p className="eyebrow">TRADING PERFORMANCE</p><h1>{view==="calendar"?"Trading calendar":"Trade journal"}</h1></div><div className="top-actions"><button className="outline" onClick={exportCsv}><Download size={16}/> Export CSV</button><label className="outline upload"><Upload size={16}/> Import CSV<input type="file" accept=".csv,text/csv" onChange={e=>importCsv(e.target.files?.[0])}/></label><button className="primary add-top" onClick={()=>openNew(dateKey(new Date()))}><Plus size={17}/> Add trade</button></div></header>
      {notice&&<div className="notice-bar">{notice}<button onClick={()=>setNotice("")}><X size={14}/></button></div>}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-head">This month <CalendarDays size={17}/></div><strong className={monthPnl>=0?"positive":"negative"}>{fmt(monthPnl)}</strong><span>Net realized P&amp;L</span></div>
        <div className="stat-card"><div className="stat-head">Total trades <Activity size={17}/></div><strong>{monthTrades.length}</strong><span>Trades this month</span></div>
        <div className="stat-card"><div className="stat-head">Win rate <Target size={17}/></div><strong>{winRate.toFixed(1)}%</strong><span>{wins} winning trades</span></div>
        <div className="stat-card"><div className="stat-head">All-time P&amp;L <Wallet size={17}/></div><strong className={totalPnl>=0?"positive":"negative"}>{fmt(totalPnl)}</strong><span>Across all recorded trades</span></div>
      </div>
      {view==="calendar"?<div className="content-grid"><section className="calendar-panel"><div className="calendar-toolbar"><div><h2>{monthLabel(month)}</h2><p>Review your performance day by day</p></div><div className="month-nav"><button className="icon-btn" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft/></button><button className="today-btn" onClick={()=>setMonth(new Date(new Date().getFullYear(),new Date().getMonth(),1))}>Today</button><button className="icon-btn" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight/></button></div></div>
        <div className="weekdays">{["MON","TUE","WED","THU","FRI","SAT","SUN"].map(d=><div key={d}>{d}</div>)}</div>
        <div className="calendar-grid">{cells.map((d,i)=>{if(!d)return <div className="empty-day" key={`e${i}`}/>;const key=dateKey(d);const ts=byDate.get(key)||[];const pnl=ts.reduce((s,t)=>s+Number(t.pnl||0),0);const isSelected=key===selectedDate;return <button key={key} className={`day-cell ${isSelected?"selected":""} ${ts.length?(pnl>=0?"day-profit":"day-loss"):""}`} onClick={()=>setSelectedDate(key)} onDoubleClick={()=>openNew(key)}><span className="day-number">{d.getDate()}</span>{ts.length>0&&<><span className={`day-pnl ${pnl>=0?"positive":"negative"}`}>{pnl>=0?"+":""}{fmt(pnl)}</span><span className="day-count">{ts.length} {ts.length===1?"trade":"trades"}</span></>}</button>})}</div>
        <div className="calendar-legend"><span><i className="dot green"/> Profitable day</span><span><i className="dot red"/> Losing day</span><span><i className="dot gray"/> No trades</span><span className="muted">Double-click a date to add a trade</span></div>
      </section><aside className="day-panel"><div className="day-panel-head"><div><p className="eyebrow">DAILY BREAKDOWN</p><h2>{new Date(selectedDate+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</h2></div><button className="primary small" onClick={()=>openNew(selectedDate)}><Plus size={15}/> Add</button></div>{selectedTrades.length===0?<div className="empty-state"><div className="empty-icon"><CalendarDays/></div><b>No trades recorded</b><p>Add a trade to start building your journal for this day.</p><button className="outline" onClick={()=>openNew(selectedDate)}>Add your first trade</button></div>:<div className="trade-list">{selectedTrades.map(t=><TradeRow key={t.id} trade={t} onEdit={()=>openEdit(t)} onDelete={()=>deleteTrade(t)}/>)}</div>}<div className="day-total"><span>Day total</span><b className={selectedTrades.reduce((s,t)=>s+t.pnl,0)>=0?"positive":"negative"}>{fmt(selectedTrades.reduce((s,t)=>s+t.pnl,0))}</b></div></aside></div>
      :<section className="journal-panel"><div className="journal-heading"><div><h2>All trades</h2><p>Your complete trading history</p></div><span>{trades.length} records</span></div>{busy?<p className="muted">Loading trades…</p>:trades.length===0?<div className="empty-state"><BookOpen/><b>Your journal is empty</b><p>Add your first trade or import a CSV file.</p></div>:<div className="table-wrap"><table><thead><tr><th>Date</th><th>Symbol</th><th>Side</th><th>Entry</th><th>Exit</th><th>Strategy</th><th>P&amp;L</th><th></th></tr></thead><tbody>{trades.map(t=><tr key={t.id}><td>{t.trade_date}</td><td><b>{t.symbol}</b></td><td><span className={`side-pill ${t.side.toLowerCase()}`}>{t.side}</span></td><td>{t.entry_price??"—"}</td><td>{t.exit_price??"—"}</td><td>{t.strategy||"—"}</td><td className={t.pnl>=0?"positive":"negative"}>{fmt(t.pnl)}</td><td><button className="icon-btn" onClick={()=>openEdit(t)}><Pencil size={15}/></button></td></tr>)}</tbody></table></div>}</section>}
      <footer>TradeCal · Your trades, your data. <span>Remember to back up your records regularly.</span></footer>
    </section>
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="trade-modal" onSubmit={saveTrade}><div className="modal-head"><div><p className="eyebrow">{editing?"EDIT RECORD":"NEW RECORD"}</p><h2>{editing?"Update trade":"Add a trade"}</h2></div><button type="button" className="icon-btn" onClick={()=>setModal(false)}><X/></button></div><div className="form-grid"><label className="wide">Trade date<input type="date" value={draft.trade_date} onChange={e=>setDraft({...draft,trade_date:e.target.value})} required/></label><label>Symbol<input value={draft.symbol} onChange={e=>setDraft({...draft,symbol:e.target.value.toUpperCase()})} placeholder="EURUSD" required/></label><label>Direction<select value={draft.side} onChange={e=>setDraft({...draft,side:e.target.value})}><option>Buy</option><option>Sell</option></select></label><label>Entry price<input type="number" step="any" value={draft.entry_price??""} onChange={e=>setDraft({...draft,entry_price:e.target.value})}/></label><label>Exit price<input type="number" step="any" value={draft.exit_price??""} onChange={e=>setDraft({...draft,exit_price:e.target.value})}/></label><label>Stop loss<input type="number" step="any" value={draft.stop_loss??""} onChange={e=>setDraft({...draft,stop_loss:e.target.value})}/></label><label>Take profit<input type="number" step="any" value={draft.take_profit??""} onChange={e=>setDraft({...draft,take_profit:e.target.value})}/></label><label>Lot size<input type="number" step="any" value={draft.lot_size??""} onChange={e=>setDraft({...draft,lot_size:e.target.value})}/></label><label>Net P&amp;L ($)<input type="number" step="0.01" value={draft.pnl} onChange={e=>setDraft({...draft,pnl:e.target.value})} required/></label><label className="wide">Strategy / setup<input value={draft.strategy} onChange={e=>setDraft({...draft,strategy:e.target.value})} placeholder="SMC, ICT, FVG, OB, liquidity sweep…"/></label><label className="wide">Trade notes<textarea rows={4} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} placeholder="Why did you enter? What did you learn?"/></label></div><div className="modal-actions">{editing&&<button type="button" className="danger-text" onClick={()=>{deleteTrade(editing);setModal(false)}}><Trash2 size={15}/> Delete</button>}<button type="button" className="outline" onClick={()=>setModal(false)}>Cancel</button><button className="primary" disabled={busy}>{busy?"Saving…":"Save trade"}</button></div></form></div>}
  </main>;
}
function TradeRow({trade,onEdit,onDelete}:{trade:Trade;onEdit:()=>void;onDelete:()=>void}){
  return <div className="trade-row"><div className="trade-row-top"><div><b>{trade.symbol}</b><span className={`side-pill ${trade.side.toLowerCase()}`}>{trade.side}</span></div><b className={trade.pnl>=0?"positive":"negative"}>{fmt(trade.pnl)}</b></div><div className="trade-meta">{trade.strategy||"No setup"}{trade.lot_size?` · ${trade.lot_size} lots`:""}</div>{trade.notes&&<p className="trade-notes">{trade.notes}</p>}<div className="trade-actions"><button onClick={onEdit}><Pencil size={13}/> Edit</button><button onClick={onDelete}><Trash2 size={13}/> Delete</button></div></div>;
}