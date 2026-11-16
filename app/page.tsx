"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Activity, Building2, CalendarDays, CreditCard, LayoutDashboard,
  LogOut, Menu, Plus, RefreshCw, Search, Trash2, Users, Wallet,
  X, ArrowDownCircle, ArrowUpCircle
} from "lucide-react";

type Company = { id: string; nome: string; tipo?: string | null };
type Client = {
  id: string; empresa_id: string; nome: string; whatsapp: string | null;
  mac: string | null; aplicativo: string | null; observacoes: string | null;
  data_contratacao: string | null; status: string;
};
type Payment = {
  id: string; empresa_id: string; cliente_id: string | null; valor: number;
  data_vencimento: string | null; data_pagamento: string | null;
  forma_pagamento: string | null; status: string; descricao: string | null;
};
type Expense = {
  id: string; empresa_id: string; descricao: string; categoria: string | null;
  valor: number; data_vencimento: string | null; data_pagamento: string | null;
  forma_pagamento: string | null; status: string; observacoes: string | null;
};
type Subscription = {
  id: string; cliente_id: string; nome_plano: string; quantidade_telas: number;
  valor: number; periodicidade: string; data_vencimento: string; status: string;
};

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
const today = () => new Date().toISOString().slice(0, 10);
const VISIONTV_LOGO = "data:image/webp;base64,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";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"inicio" | "clientes" | "financeiro">("inicio");
  const [menuOpen, setMenuOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [search, setSearch] = useState("");
  const [clientForm, setClientForm] = useState({ nome: "", whatsapp: "", mac: "", aplicativo: "", observacoes: "", data_contratacao: today(), status: "ativo", plano: "", telas: "1", valor: "", periodicidade: "mensal", vencimento: "" });
  const [paymentForm, setPaymentForm] = useState({ cliente_id: "", descricao: "", valor: "", data_vencimento: today(), data_pagamento: today(), forma_pagamento: "pix", status: "pago" });
  const [expenseForm, setExpenseForm] = useState({ descricao: "", categoria: "", valor: "", data_vencimento: today(), data_pagamento: "", forma_pagamento: "pix", status: "pendente", observacoes: "" });
  const [showClientForm, setShowClientForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const u = data.session?.user;
      setUser(u ? { id: u.id, email: u.email ?? "" } : null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? "" } : null);
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (user) void loadData(); }, [user]);

  async function loadData() {
    setError("");
    const [c, cl, p, e, s] = await Promise.all([
      supabase.from("empresas").select("id,nome,tipo").order("nome"),
      supabase.from("clientes").select("id,empresa_id,nome,whatsapp,mac,aplicativo,observacoes,data_contratacao,status").order("nome"),
      supabase.from("pagamentos").select("id,empresa_id,cliente_id,valor,data_vencimento,data_pagamento,forma_pagamento,status,descricao").order("created_at", { ascending: false }),
      supabase.from("despesas").select("id,empresa_id,descricao,categoria,valor,data_vencimento,data_pagamento,forma_pagamento,status,observacoes").order("created_at", { ascending: false }),
      supabase.from("assinaturas").select("id,cliente_id,nome_plano,quantidade_telas,valor,periodicidade,data_vencimento,status").order("data_vencimento")
    ]);
    const firstError = c.error || cl.error || p.error || e.error || s.error;
    if (firstError) setError("Não foi possível carregar todos os dados: " + firstError.message);
    const cs = (c.data ?? []) as Company[];
    setCompanies(cs);
    setCompanyId((current) => current || cs[0]?.id || "");
    setClients((cl.data ?? []) as Client[]);
    setPayments((p.data ?? []) as Payment[]);
    setExpenses((e.data ?? []) as Expense[]);
    setSubscriptions((s.data ?? []) as Subscription[]);
  }

  async function signIn(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Não foi possível entrar. Confira o e-mail e a senha.");
    setBusy(false);
  }
  async function signOut() { await supabase.auth.signOut(); setUser(null); }

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    if (newPassword.length < 8) { setError("A nova senha precisa ter pelo menos 8 caracteres."); return; }
    if (newPassword !== confirmPassword) { setError("As senhas não coincidem."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setError("Não foi possível alterar a senha: " + error.message);
    else { setRecoveryMode(false); setNewPassword(""); setConfirmPassword(""); setNotice("Senha alterada com sucesso."); }
    setBusy(false);
  }

  async function addCompany(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !companyName.trim()) return;
    setBusy(true); setError(""); setNotice("");
    const { data, error } = await supabase.from("empresas").insert({ owner_id: user.id, nome: companyName.trim(), tipo: "empresa" }).select("id,nome,tipo").single();
    if (error) setError(error.message);
    else { setCompanies((old) => [...old, data as Company]); setCompanyId(data.id); setCompanyName(""); setShowCompanyForm(false); setNotice("Empresa cadastrada."); }
    setBusy(false);
  }

  async function addClient(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !companyId) { setError("Cadastre ou selecione uma empresa antes de incluir clientes."); return; }
    setBusy(true); setError(""); setNotice("");
    const { data, error } = await supabase.from("clientes").insert({
      owner_id: user.id, empresa_id: companyId, nome: clientForm.nome.trim(),
      whatsapp: clientForm.whatsapp || null, mac: clientForm.mac || null,
      aplicativo: clientForm.aplicativo || null, observacoes: clientForm.observacoes || null,
      data_contratacao: clientForm.data_contratacao || null, status: clientForm.status
    }).select("id,empresa_id,nome,whatsapp,mac,aplicativo,observacoes,data_contratacao,status").single();
    if (error) setError(error.message);
    else {
      if (clientForm.plano && clientForm.valor && clientForm.vencimento) {
        const { error: subError } = await supabase.from("assinaturas").insert({
          owner_id: user.id, empresa_id: companyId, cliente_id: data.id,
          nome_plano: clientForm.plano, quantidade_telas: Number(clientForm.telas),
          valor: Number(clientForm.valor), periodicidade: clientForm.periodicidade,
          data_inicio: clientForm.data_contratacao || today(), data_vencimento: clientForm.vencimento,
          status: "ativa"
        });
        if (subError) setError("Cliente salvo, mas a assinatura não foi criada: " + subError.message);
      }
      setClients((old) => [data as Client, ...old]);
      setClientForm({ nome: "", whatsapp: "", mac: "", aplicativo: "", observacoes: "", data_contratacao: today(), status: "ativo", plano: "", telas: "1", valor: "", periodicidade: "mensal", vencimento: "" });
      setShowClientForm(false); setNotice("Cliente cadastrado.");
      await loadData();
    }
    setBusy(false);
  }

  async function addPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !companyId) { setError("Cadastre ou selecione uma empresa primeiro."); return; }
    setBusy(true); setError(""); setNotice("");
    const { data, error } = await supabase.from("pagamentos").insert({
      owner_id: user.id, empresa_id: companyId, cliente_id: paymentForm.cliente_id || null,
      valor: Number(paymentForm.valor), descricao: paymentForm.descricao || "Recebimento",
      data_vencimento: paymentForm.data_vencimento || null,
      data_pagamento: paymentForm.status === "pago" ? (paymentForm.data_pagamento || today()) : null,
      forma_pagamento: paymentForm.forma_pagamento, status: paymentForm.status
    }).select("id,empresa_id,cliente_id,valor,data_vencimento,data_pagamento,forma_pagamento,status,descricao").single();
    if (error) setError(error.message);
    else { setPayments((old) => [data as Payment, ...old]); setPaymentForm({ cliente_id: "", descricao: "", valor: "", data_vencimento: today(), data_pagamento: today(), forma_pagamento: "pix", status: "pago" }); setShowPaymentForm(false); setNotice("Recebimento registrado."); }
    setBusy(false);
  }

  async function addExpense(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !companyId) { setError("Cadastre ou selecione uma empresa primeiro."); return; }
    setBusy(true); setError(""); setNotice("");
    const { data, error } = await supabase.from("despesas").insert({
      owner_id: user.id, empresa_id: companyId, descricao: expenseForm.descricao.trim(),
      categoria: expenseForm.categoria || null, valor: Number(expenseForm.valor),
      data_vencimento: expenseForm.data_vencimento || null,
      data_pagamento: expenseForm.status === "pago" ? (expenseForm.data_pagamento || today()) : null,
      forma_pagamento: expenseForm.forma_pagamento, status: expenseForm.status,
      observacoes: expenseForm.observacoes || null
    }).select("id,empresa_id,descricao,categoria,valor,data_vencimento,data_pagamento,forma_pagamento,status,observacoes").single();
    if (error) setError(error.message);
    else { setExpenses((old) => [data as Expense, ...old]); setExpenseForm({ descricao: "", categoria: "", valor: "", data_vencimento: today(), data_pagamento: "", forma_pagamento: "pix", status: "pendente", observacoes: "" }); setShowExpenseForm(false); setNotice("Despesa registrada."); }
    setBusy(false);
  }

  async function deleteClient(client: Client) {
    if (!confirm("Excluir este cliente e os registros vinculados a ele?")) return;
    const { error } = await supabase.from("clientes").delete().eq("id", client.id);
    if (error) setError(error.message); else { setClients((old) => old.filter((x) => x.id !== client.id)); setNotice("Cliente excluído."); }
  }
  async function deleteFinance(table: "pagamentos" | "despesas", id: string) {
    if (!confirm("Deseja excluir este lançamento?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) setError(error.message);
    else { if (table === "pagamentos") setPayments((old) => old.filter((x) => x.id !== id)); else setExpenses((old) => old.filter((x) => x.id !== id)); setNotice("Lançamento excluído."); }
  }

  const filteredClients = useMemo(() => clients.filter((c) => c.empresa_id === companyId && (c.nome.toLowerCase().includes(search.toLowerCase()) || (c.whatsapp ?? "").includes(search) || (c.mac ?? "").toLowerCase().includes(search.toLowerCase()))), [clients, companyId, search]);
  const companyPayments = payments.filter((p) => p.empresa_id === companyId);
  const companyExpenses = expenses.filter((e) => e.empresa_id === companyId);
  const received = companyPayments.filter((p) => p.status === "pago").reduce((sum, p) => sum + Number(p.valor), 0);
  const spent = companyExpenses.filter((e) => e.status === "pago").reduce((sum, e) => sum + Number(e.valor), 0);
  const pendingPayments = companyPayments.filter((p) => p.status !== "pago").reduce((sum, p) => sum + Number(p.valor), 0);
  const pendingExpenses = companyExpenses.filter((e) => e.status !== "pago").reduce((sum, e) => sum + Number(e.valor), 0);
  const upcoming = subscriptions.filter((s) => clients.some((c) => c.id === s.cliente_id && c.empresa_id === companyId) && s.status === "ativa").sort((a,b) => a.data_vencimento.localeCompare(b.data_vencimento)).slice(0, 6);

  if (loading) return <main className="min-h-screen grid place-items-center text-slate-400">Carregando VisionTV Gestor...</main>;
  if (recoveryMode) return (
    <main className="min-h-screen flex items-center justify-center p-5">
      <section className="w-full max-w-md rounded-3xl border border-line bg-panel p-8 shadow-2xl">
        <div className="mb-6 flex justify-center"><img src={VISIONTV_LOGO} alt="VisionTV" className="h-32 w-full max-w-xs object-contain" /></div><div className="mb-6 text-center"><h1 className="text-2xl font-bold">VisionTV Gestor</h1><p className="text-sm text-muted">Redefinição de senha</p></div>
        <h2 className="mb-2 text-xl font-semibold">Crie uma nova senha</h2>
        <form onSubmit={updatePassword} className="space-y-4">
          <label className="block text-sm text-slate-300">Nova senha<input value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} type="password" minLength={8} required autoComplete="new-password" className="mt-2 w-full rounded-xl border border-line bg-ink px-4 py-3"/></label>
          <label className="block text-sm text-slate-300">Confirme a nova senha<input value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} type="password" minLength={8} required autoComplete="new-password" className="mt-2 w-full rounded-xl border border-line bg-ink px-4 py-3"/></label>
          {error && <p className="rounded-xl bg-rose-950/60 p-3 text-sm text-rose-300">{error}</p>}
          {notice && <p className="rounded-xl bg-emerald-950/50 p-3 text-sm text-emerald-300">{notice}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-rose-600 px-4 py-3 font-semibold disabled:opacity-60">{busy ? "Salvando..." : "Salvar nova senha"}</button>
        </form>
      </section>
    </main>
  );
  if (!user) return (
    <main className="min-h-screen flex items-center justify-center p-5">
      <section className="w-full max-w-md rounded-3xl border border-line bg-panel p-8 shadow-2xl">
        <div className="mb-8"><img src={VISIONTV_LOGO} alt="VisionTV" className="mx-auto h-36 w-full max-w-sm object-contain" /><p className="mt-2 text-center text-sm text-muted">Gestão em um só lugar</p></div>
        <h2 className="mb-2 text-xl font-semibold">Acessar sua conta</h2><p className="mb-6 text-sm text-muted">Entre com sua conta cadastrada.</p>
        <form onSubmit={signIn} className="space-y-4">
          <label className="block text-sm text-slate-300">E-mail<input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required className="mt-2 w-full rounded-xl border border-line bg-ink px-4 py-3"/></label>
          <label className="block text-sm text-slate-300">Senha<input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" required className="mt-2 w-full rounded-xl border border-line bg-ink px-4 py-3"/></label>
          {error && <p className="rounded-xl bg-rose-950/60 p-3 text-sm text-rose-300">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-rose-600 px-4 py-3 font-semibold disabled:opacity-60">{busy ? "Entrando..." : "Entrar"}</button>
        </form>
        <p className="mt-6 text-xs leading-5 text-muted">Acesso privado. Não compartilhe sua senha ou chaves privadas.</p>
      </section>
    </main>
  );

  const nav = [{ id: "inicio" as const, label: "Visão geral", icon: LayoutDashboard }, { id: "clientes" as const, label: "Clientes", icon: Users }, { id: "financeiro" as const, label: "Financeiro", icon: Wallet }];
  const inputClass = "w-full rounded-xl border border-line bg-ink px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-rose-500";
  const field = (label: string, control: React.ReactNode) => <label className="block space-y-1.5 text-sm text-slate-300">{label}{control}</label>;

  return (
    <main className="min-h-screen md:flex">
      <aside className={`${menuOpen ? "block" : "hidden"} fixed inset-y-0 left-0 z-30 w-64 border-r border-line bg-[#0d1421] p-5 md:block`}>
        <div className="mb-10"><img src={VISIONTV_LOGO} alt="VisionTV" className="h-24 w-full object-contain" /><p className="mt-1 text-center text-xs tracking-widest text-muted">GESTOR</p></div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Menu principal</p>
        <nav className="space-y-2 text-sm">{nav.map(({id,label,icon:Icon})=><button key={id} onClick={()=>{setTab(id);setMenuOpen(false);setSearch("");}} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left ${tab===id ? "bg-rose-600/15 text-rose-300" : "text-slate-400 hover:bg-slate-800"}`}><Icon size={18}/>{label}</button>)}</nav>
        <div className="absolute bottom-5 left-5 right-5 text-xs text-muted">Acesso privado • VisionTV Gestor</div>
      </aside>
      <section className="min-w-0 flex-1 md:ml-64">
        <header className="flex items-center justify-between border-b border-line bg-[#0d1421] px-4 py-4 md:px-8">
          <div className="flex items-center gap-3"><button onClick={()=>setMenuOpen(!menuOpen)} className="rounded-lg border border-line p-2 md:hidden" aria-label="Abrir menu"><Menu size={19}/></button><div className="flex items-center gap-3"><img src={VISIONTV_LOGO} alt="VisionTV" className="h-12 w-24 object-contain" /><div><p className="text-sm text-muted">Painel de controle</p><h1 className="text-xl font-bold">VisionTV Gestor</h1></div></div></div>
          <div className="flex items-center gap-2"><span className="hidden max-w-48 truncate text-xs text-muted sm:block">{user.email}</span><button onClick={signOut} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-slate-300"><LogOut size={16}/><span className="hidden sm:inline">Sair</span></button></div>
        </header>
        <div className="space-y-6 p-4 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-2xl font-bold">{tab==="inicio"?"Visão geral":tab==="clientes"?"Gestão de clientes":"Financeiro"}</h2><p className="mt-1 text-sm text-muted">Dados sincronizados com sua conta na nuvem.</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Selecionar empresa" value={companyId} onChange={(e)=>setCompanyId(e.target.value)} className={inputClass+" w-auto min-w-36"}><option value="">Selecione empresa</option>{companies.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
              <button onClick={()=>setShowCompanyForm(true)} className="rounded-xl border border-line px-3 py-2 text-sm hover:bg-slate-800"><Building2 size={16} className="mr-1 inline"/> Empresa</button>
              <button onClick={()=>void loadData()} className="rounded-xl border border-line p-2.5 hover:bg-slate-800" title="Atualizar"><RefreshCw size={16}/></button>
            </div>
          </div>
          {error && <div className="rounded-xl border border-rose-700/50 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div>}
          {notice && <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-3 text-sm text-emerald-200">{notice}</div>}
          {!companies.length && <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-5"><h3 className="font-semibold text-amber-200">Cadastre sua primeira empresa</h3><p className="mt-1 text-sm text-slate-300">Os clientes e lançamentos ficam vinculados à empresa selecionada.</p><button onClick={()=>setShowCompanyForm(true)} className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold"><Plus size={16} className="mr-1 inline"/> Cadastrar empresa</button></div>}
          {tab==="inicio" && <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {label:"Clientes",value:clients.filter(c=>c.empresa_id===companyId).length,icon:Users},
                {label:"Recebido",value:money(received),icon:ArrowUpCircle},
                {label:"Despesas pagas",value:money(spent),icon:ArrowDownCircle},
                {label:"Saldo realizado",value:money(received-spent),icon:Wallet}
              ].map(({label,value,icon:Icon})=><article key={label} className="rounded-2xl border border-line bg-panel p-5"><div className="flex items-center justify-between text-sm text-muted">{label}<Icon size={19} className="text-rose-300"/></div><p className="mt-4 text-2xl font-bold">{value}</p></article>)}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-line bg-panel p-5"><h3 className="font-semibold">Valores pendentes</h3><div className="mt-4 flex justify-between text-sm"><span className="text-muted">A receber</span><b>{money(pendingPayments)}</b></div><div className="mt-3 flex justify-between text-sm"><span className="text-muted">A pagar</span><b>{money(pendingExpenses)}</b></div></article>
              <article className="rounded-2xl border border-line bg-panel p-5"><h3 className="font-semibold">Próximos vencimentos</h3>{upcoming.length ? <div className="mt-3 space-y-3">{upcoming.map(s=><div key={s.id} className="flex items-center justify-between gap-3 border-b border-line pb-2 text-sm"><span className="truncate">{clients.find(c=>c.id===s.cliente_id)?.nome ?? "Cliente"} · {s.nome_plano}</span><b>{new Date(s.data_vencimento+"T12:00:00").toLocaleDateString("pt-BR")}</b></div>)}</div> : <p className="mt-3 text-sm text-muted">Nenhuma assinatura ativa encontrada para esta empresa.</p>}</article>
            </div>
          </>}
          {tab==="clientes" && <>
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="relative min-w-52 flex-1"><Search size={17} className="absolute left-3 top-3 text-muted"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nome, WhatsApp ou MAC" className={inputClass+" pl-9"}/></div><button onClick={()=>setShowClientForm(!showClientForm)} disabled={!companyId} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"><Plus size={16} className="mr-1 inline"/> Novo cliente</button></div>
            {showClientForm && <form onSubmit={addClient} className="grid gap-3 rounded-2xl border border-line bg-panel p-5 sm:grid-cols-2">
              {field("Nome completo",<input required value={clientForm.nome} onChange={e=>setClientForm({...clientForm,nome:e.target.value})} className={inputClass}/>)}{field("WhatsApp",<input value={clientForm.whatsapp} onChange={e=>setClientForm({...clientForm,whatsapp:e.target.value})} className={inputClass}/>)}{field("MAC",<input value={clientForm.mac} onChange={e=>setClientForm({...clientForm,mac:e.target.value})} className={inputClass}/>)}{field("Aplicativo",<input value={clientForm.aplicativo} onChange={e=>setClientForm({...clientForm,aplicativo:e.target.value})} className={inputClass}/>)}{field("Data de contratação",<input type="date" value={clientForm.data_contratacao} onChange={e=>setClientForm({...clientForm,data_contratacao:e.target.value})} className={inputClass}/>)}{field("Status",<select value={clientForm.status} onChange={e=>setClientForm({...clientForm,status:e.target.value})} className={inputClass}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select>)}
              {field("Observações",<textarea value={clientForm.observacoes} onChange={e=>setClientForm({...clientForm,observacoes:e.target.value})} className={inputClass}/ >)}<div className="sm:col-span-2 border-t border-line pt-3"><p className="mb-3 text-sm font-semibold">Assinatura (opcional)</p><div className="grid gap-3 sm:grid-cols-3">{field("Plano",<input value={clientForm.plano} onChange={e=>setClientForm({...clientForm,plano:e.target.value})} placeholder="Ex.: Mensal" className={inputClass}/>)}{field("Quantidade de telas",<input type="number" min="1" value={clientForm.telas} onChange={e=>setClientForm({...clientForm,telas:e.target.value})} className={inputClass}/>)}{field("Valor (R$)",<input type="number" min="0" step="0.01" value={clientForm.valor} onChange={e=>setClientForm({...clientForm,valor:e.target.value})} className={inputClass}/>)}{field("Periodicidade",<select value={clientForm.periodicidade} onChange={e=>setClientForm({...clientForm,periodicidade:e.target.value})} className={inputClass}><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option></select>)}{field("Vencimento",<input type="date" value={clientForm.vencimento} onChange={e=>setClientForm({...clientForm,vencimento:e.target.value})} className={inputClass}/>)}</div></div>
              <div className="flex gap-2 sm:col-span-2"><button disabled={busy} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold">{busy?"Salvando...":"Salvar cliente"}</button><button type="button" onClick={()=>setShowClientForm(false)} className="rounded-xl border border-line px-4 py-2.5 text-sm">Cancelar</button></div>
            </form>}
            <div className="overflow-hidden rounded-2xl border border-line bg-panel"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-900/70 text-xs uppercase text-muted"><tr><th className="p-4">Cliente</th><th className="p-4">Contato</th><th className="p-4">Assinatura / vencimento</th><th className="p-4">Status</th><th className="p-4">Ação</th></tr></thead><tbody>{filteredClients.map(c=>{const sub=subscriptions.filter(s=>s.cliente_id===c.id).sort((a,b)=>b.data_vencimento.localeCompare(a.data_vencimento))[0];return <tr key={c.id} className="border-t border-line"><td className="p-4 font-medium">{c.nome}</td><td className="p-4 text-muted">{c.whatsapp||"—"}<span className="block text-xs text-muted">{c.aplicativo||"Sem aplicativo"} · {c.mac||"Sem MAC"}</span></td><td className="p-4">{sub?<><span>{sub.nome_plano}</span><span className="block text-xs text-muted">{new Date(sub.data_vencimento+"T12:00:00").toLocaleDateString("pt-BR")}</span></>:"Sem assinatura"}</td><td className="p-4"><span className={`rounded-full px-2 py-1 text-xs ${c.status==="ativo"?"bg-emerald-950 text-emerald-300":"bg-slate-800 text-slate-300"}`}>{c.status}</span></td><td className="p-4"><button onClick={()=>void deleteClient(c)} className="text-rose-300" title="Excluir cliente"><Trash2 size={16}/></button></td></tr>})}{!filteredClients.length&&<tr><td colSpan={5} className="p-8 text-center text-muted">Nenhum cliente encontrado nesta empresa.</td></tr>}</tbody></table></div></div>
          </>}
          {tab==="financeiro" && <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{label:"Recebido",value:money(received)},{label:"Despesas pagas",value:money(spent)},{label:"A receber",value:money(pendingPayments)},{label:"A pagar",value:money(pendingExpenses)}].map(x=><article key={x.label} className="rounded-2xl border border-line bg-panel p-5"><p className="text-sm text-muted">{x.label}</p><p className="mt-3 text-xl font-bold">{x.value}</p></article>)}</div>
            <div className="flex flex-wrap gap-2"><button onClick={()=>setShowPaymentForm(!showPaymentForm)} disabled={!companyId} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"><Plus size={16} className="mr-1 inline"/> Registrar recebimento</button><button onClick={()=>setShowExpenseForm(!showExpenseForm)} disabled={!companyId} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"><Plus size={16} className="mr-1 inline"/> Registrar despesa</button></div>
            {showPaymentForm&&<form onSubmit={addPayment} className="grid gap-3 rounded-2xl border border-line bg-panel p-5 sm:grid-cols-2">{field("Descrição",<input value={paymentForm.descricao} onChange={e=>setPaymentForm({...paymentForm,descricao:e.target.value})} placeholder="Mensalidade, serviço..." className={inputClass}/>)}{field("Cliente (opcional)",<select value={paymentForm.cliente_id} onChange={e=>setPaymentForm({...paymentForm,cliente_id:e.target.value})} className={inputClass}><option value="">Sem vínculo</option>{clients.filter(c=>c.empresa_id===companyId).map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>)}{field("Valor (R$)",<input required type="number" min="0.01" step="0.01" value={paymentForm.valor} onChange={e=>setPaymentForm({...paymentForm,valor:e.target.value})} className={inputClass}/>)}{field("Vencimento",<input type="date" value={paymentForm.data_vencimento} onChange={e=>setPaymentForm({...paymentForm,data_vencimento:e.target.value})} className={inputClass}/>)}{field("Forma de pagamento",<select value={paymentForm.forma_pagamento} onChange={e=>setPaymentForm({...paymentForm,forma_pagamento:e.target.value})} className={inputClass}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option><option value="outro">Outro</option></select>)}{field("Situação",<select value={paymentForm.status} onChange={e=>setPaymentForm({...paymentForm,status:e.target.value})} className={inputClass}><option value="pago">Recebido</option><option value="pendente">Pendente</option></select>)}<div className="flex gap-2 sm:col-span-2"><button disabled={busy} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold">Salvar recebimento</button><button type="button" onClick={()=>setShowPaymentForm(false)} className="rounded-xl border border-line px-4 py-2.5 text-sm">Cancelar</button></div></form>}
            {showExpenseForm&&<form onSubmit={addExpense} className="grid gap-3 rounded-2xl border border-line bg-panel p-5 sm:grid-cols-2">{field("Descrição",<input required value={expenseForm.descricao} onChange={e=>setExpenseForm({...expenseForm,descricao:e.target.value})} className={inputClass}/>)}{field("Categoria",<input value={expenseForm.categoria} onChange={e=>setExpenseForm({...expenseForm,categoria:e.target.value})} placeholder="Internet, ferramentas..." className={inputClass}/>)}{field("Valor (R$)",<input required type="number" min="0.01" step="0.01" value={expenseForm.valor} onChange={e=>setExpenseForm({...expenseForm,valor:e.target.value})} className={inputClass}/>)}{field("Vencimento",<input type="date" value={expenseForm.data_vencimento} onChange={e=>setExpenseForm({...expenseForm,data_vencimento:e.target.value})} className={inputClass}/>)}{field("Forma de pagamento",<select value={expenseForm.forma_pagamento} onChange={e=>setExpenseForm({...expenseForm,forma_pagamento:e.target.value})} className={inputClass}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option><option value="outro">Outro</option></select>)}{field("Situação",<select value={expenseForm.status} onChange={e=>setExpenseForm({...expenseForm,status:e.target.value})} className={inputClass}><option value="pendente">Pendente</option><option value="pago">Pago</option></select>)}{field("Observações",<input value={expenseForm.observacoes} onChange={e=>setExpenseForm({...expenseForm,observacoes:e.target.value})} className={inputClass}/>)}<div className="flex gap-2 sm:col-span-2"><button disabled={busy} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold">Salvar despesa</button><button type="button" onClick={()=>setShowExpenseForm(false)} className="rounded-xl border border-line px-4 py-2.5 text-sm">Cancelar</button></div></form>}
            <div className="grid gap-4 xl:grid-cols-2">
              <article className="overflow-hidden rounded-2xl border border-line bg-panel"><h3 className="p-4 font-semibold">Recebimentos</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-900/70 text-xs text-muted"><tr><th className="p-3">Descrição</th><th className="p-3">Valor</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead><tbody>{companyPayments.map(p=><tr key={p.id} className="border-t border-line"><td className="p-3">{p.descricao||"Recebimento"}</td><td className="p-3">{money(p.valor)}</td><td className="p-3">{p.status}</td><td className="p-3"><button onClick={()=>void deleteFinance("pagamentos",p.id)} className="text-rose-300"><Trash2 size={15}/></button></td></tr>)}{!companyPayments.length&&<tr><td colSpan={4} className="p-5 text-center text-muted">Nenhum recebimento.</td></tr>}</tbody></table></div></article>
              <article className="overflow-hidden rounded-2xl border border-line bg-panel"><h3 className="p-4 font-semibold">Despesas</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-900/70 text-xs text-muted"><tr><th className="p-3">Descrição</th><th className="p-3">Valor</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead><tbody>{companyExpenses.map(e=><tr key={e.id} className="border-t border-line"><td className="p-3">{e.descricao}</td><td className="p-3">{money(e.valor)}</td><td className="p-3">{e.status}</td><td className="p-3"><button onClick={()=>void deleteFinance("despesas",e.id)} className="text-rose-300"><Trash2 size={15}/></button></td></tr>)}{!companyExpenses.length&&<tr><td colSpan={4} className="p-5 text-center text-muted">Nenhuma despesa.</td></tr>}</tbody></table></div></article>
            </div>
          </>}
        </div>
      </section>
      {showCompanyForm&&<div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4"><form onSubmit={addCompany} className="w-full max-w-md rounded-2xl border border-line bg-panel p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Cadastrar empresa</h3><button type="button" onClick={()=>setShowCompanyForm(false)}><X size={18}/></button></div><label className="block text-sm text-slate-300">Nome da empresa<input required value={companyName} onChange={e=>setCompanyName(e.target.value)} className={inputClass+" mt-2"}/></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>setShowCompanyForm(false)} className="rounded-xl border border-line px-4 py-2 text-sm">Cancelar</button><button disabled={busy} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold">Salvar</button></div></form></div>}
    </main>
  );
}
