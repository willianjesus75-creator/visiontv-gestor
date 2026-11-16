"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Activity, Building2, CalendarDays, CreditCard, LayoutDashboard,
  LogOut, Menu, Plus, RefreshCw, Search, Trash2, Users, Wallet,
  X, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal
} from "lucide-react";

type Company = { id: string; nome: string; tipo?: string | null };
type Client = {
  id: string; empresa_id: string; nome: string; indicacao: string | null;
  mac: string | null; aplicativo: string | null; observacoes: string | null;
  app_vencimento: string | null; status: string;
};
type Payment = {
  id: string; empresa_id: string; cliente_id: string | null; categoria: string | null; valor: number;
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
  cobranca_status: "recebido" | "em_aberto"; recebido_em: string | null;
};

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
const today = () => new Date().toISOString().slice(0, 10);
const VISIONTV_LOGO = "/visiontv-logo.svg";

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
  const [clientForm, setClientForm] = useState({ nome: "", indicacao: "", mac: "", aplicativo: "", observacoes: "", app_vencimento: "", status: "ativo", plano: "", telas: "1", valor: "", periodicidade: "mensal", vencimento: "" });
  const [paymentForm, setPaymentForm] = useState({ categoria: "", descricao: "", valor: "", data_vencimento: today(), data_pagamento: today(), forma_pagamento: "pix", status: "pago" });
  const [expenseForm, setExpenseForm] = useState({ descricao: "", categoria: "", valor: "", data_vencimento: today(), data_pagamento: "", forma_pagamento: "pix", status: "pendente", observacoes: "" });
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [appFilter, setAppFilter] = useState("todos");
  const [planFilter, setPlanFilter] = useState("todos");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [periodMonth, setPeriodMonth] = useState(() => new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(() => new Date().getFullYear());
  const [periodManual, setPeriodManual] = useState(false);

  useEffect(() => {
    const syncCurrentPeriod = () => {
      if (periodManual) return;
      const now = new Date();
      setPeriodMonth(now.getMonth() + 1);
      setPeriodYear(now.getFullYear());
    };
    const timer = window.setInterval(syncCurrentPeriod, 60_000);
    return () => window.clearInterval(timer);
  }, [periodManual]);

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
      supabase.from("clientes").select("id,empresa_id,nome,indicacao,mac,aplicativo,observacoes,app_vencimento,status").order("nome"),
      supabase.from("pagamentos").select("id,empresa_id,cliente_id,categoria,valor,data_vencimento,data_pagamento,forma_pagamento,status,descricao").order("created_at", { ascending: false }),
      supabase.from("despesas").select("id,empresa_id,descricao,categoria,valor,data_vencimento,data_pagamento,forma_pagamento,status,observacoes").order("created_at", { ascending: false }),
      supabase.from("assinaturas").select("id,cliente_id,nome_plano,quantidade_telas,valor,periodicidade,data_vencimento,status,cobranca_status,recebido_em").order("data_vencimento")
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
    const payload = { owner_id: user.id, empresa_id: companyId, nome: clientForm.nome.trim(), indicacao: clientForm.indicacao.trim() || null, mac: clientForm.mac || null, aplicativo: clientForm.aplicativo || null, observacoes: clientForm.observacoes || null, app_vencimento: clientForm.app_vencimento || null, status: clientForm.status };
    const request = editingClient ? supabase.from("clientes").update(payload).eq("id", editingClient) : supabase.from("clientes").insert(payload);
    const { data, error } = await request.select("id,empresa_id,nome,indicacao,mac,aplicativo,observacoes,app_vencimento,status").single();
    if (error) setError(error.message);
    else {
      if (clientForm.plano && clientForm.valor && clientForm.vencimento) {
        const subscriptionPayload = {
          owner_id: user.id, empresa_id: companyId, cliente_id: data.id,
          nome_plano: clientForm.plano, quantidade_telas: Number(clientForm.telas),
          valor: Number(clientForm.valor), periodicidade: clientForm.periodicidade,
          data_inicio: today(), data_vencimento: clientForm.vencimento,
          status: "ativa"
        };
        const currentSub = subscriptions.find(x => x.cliente_id === data.id);
        const { error: subError } = currentSub
          ? await supabase.from("assinaturas").update(subscriptionPayload).eq("id", currentSub.id)
          : await supabase.from("assinaturas").insert(subscriptionPayload);
        if (subError) setError("Cliente salvo, mas a assinatura não foi atualizada: " + subError.message);
      }
      setClients((old) => [data as Client, ...old]);
      setClientForm({ nome: "", indicacao: "", mac: "", aplicativo: "", observacoes: "", app_vencimento: "", status: "ativo", plano: "", telas: "1", valor: "", periodicidade: "mensal", vencimento: "" });
      setShowClientForm(false); setEditingClient(null); setNotice(editingClient ? "Cliente atualizado." : "Cliente cadastrado.");
      await loadData();
    }
    setBusy(false);
  }

  async function addPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !companyId) { setError("Cadastre ou selecione uma empresa primeiro."); return; }
    const amount = Number(paymentForm.valor);
    if (!Number.isFinite(amount) || amount <= 0) { setError("Informe um valor válido para o recebimento."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const { data, error } = await supabase.from("pagamentos").insert({
        owner_id: user.id, empresa_id: companyId, categoria: paymentForm.categoria.trim() || null,
        valor: amount, descricao: paymentForm.descricao.trim() || "Recebimento",
        data_vencimento: paymentForm.data_vencimento || today(),
        data_pagamento: paymentForm.status === "pago" ? (paymentForm.data_pagamento || today()) : null,
        forma_pagamento: paymentForm.forma_pagamento, status: paymentForm.status
      }).select("id,empresa_id,cliente_id,categoria,valor,data_vencimento,data_pagamento,forma_pagamento,status,descricao").single();
      if (error) throw error;
      setPayments((old) => [data as Payment, ...old]);
      setPaymentForm({ categoria: "", descricao: "", valor: "", data_vencimento: today(), data_pagamento: today(), forma_pagamento: "pix", status: "pago" });
      setShowPaymentForm(false); setNotice("Recebimento registrado com sucesso.");
      await loadData();
    } catch (err) { setError("Não foi possível salvar o recebimento: " + (err instanceof Error ? err.message : "erro inesperado")); }
    finally { setBusy(false); }
  }

  async function addExpense(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !companyId) { setError("Cadastre ou selecione uma empresa primeiro."); return; }
    const amount = Number(expenseForm.valor);
    if (!expenseForm.descricao.trim()) { setError("Informe a descrição da despesa."); return; }
    if (!Number.isFinite(amount) || amount <= 0) { setError("Informe um valor válido para a despesa."); return; }
    if (!expenseForm.categoria.trim()) { setError("Informe a categoria da despesa."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const { data, error } = await supabase.from("despesas").insert({
        owner_id: user.id, empresa_id: companyId, descricao: expenseForm.descricao.trim(),
        categoria: expenseForm.categoria.trim(), valor: amount,
        data_vencimento: expenseForm.data_vencimento || today(),
        data_pagamento: expenseForm.status === "pago" ? (expenseForm.data_pagamento || today()) : null,
        forma_pagamento: expenseForm.forma_pagamento, status: expenseForm.status,
        observacoes: expenseForm.observacoes.trim() || null
      }).select("id,empresa_id,descricao,categoria,valor,data_vencimento,data_pagamento,forma_pagamento,status,observacoes").single();
      if (error) throw error;
      setExpenses((old) => [data as Expense, ...old]);
      setExpenseForm({ descricao: "", categoria: "", valor: "", data_vencimento: today(), data_pagamento: "", forma_pagamento: "pix", status: "pendente", observacoes: "" });
      setShowExpenseForm(false); setNotice("Despesa registrada com sucesso.");
      await loadData();
    } catch (err) { setError("Não foi possível salvar a despesa: " + (err instanceof Error ? err.message : "erro inesperado")); }
    finally { setBusy(false); }
  }

  function editClient(client: Client) {
    const sub = subscriptions.find(x => x.cliente_id === client.id);
    setEditingClient(client.id);
    setClientForm({nome:client.nome,indicacao:client.indicacao??"",mac:client.mac??"",aplicativo:client.aplicativo??"",observacoes:client.observacoes??"",app_vencimento:client.app_vencimento??"",status:client.status,plano:sub?.nome_plano??"",telas:String(sub?.quantidade_telas??1),valor:sub?String(sub.valor):"",periodicidade:sub?.periodicidade??"mensal",vencimento:sub?.data_vencimento??""});
    setShowClientForm(true);
  }
  async function renewClient(client: Client) {
    const sub = subscriptions.find(x => x.cliente_id === client.id);
    if (!sub) { setError("Cadastre uma assinatura antes de renovar."); return; }
    const base = new Date(today() + "T12:00:00");
    base.setDate(base.getDate() + 30);
    const due = base.getFullYear()+"-"+String(base.getMonth()+1).padStart(2,"0")+"-"+String(base.getDate()).padStart(2,"0"); setBusy(true); setError("");
    const { error } = await supabase.from("assinaturas").update({data_vencimento:due,status:"ativa"}).eq("id",sub.id);
    if (error) { setError(error.message); setBusy(false); return; }
    setNotice("Renovação concluída. O próximo vencimento foi definido para 30 dias a partir de hoje."); await loadData(); setBusy(false);
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

  const filteredClients = useMemo(() => clients.filter((c) => {
    const sub = subscriptions.filter(x => x.cliente_id === c.id).sort((a,b) => b.data_vencimento.localeCompare(a.data_vencimento))[0];
    const days = sub ? Math.ceil((new Date(sub.data_vencimento+"T12:00:00").getTime()-new Date(today()+"T12:00:00").getTime())/86400000) : null;
    const status = days === null ? "sem_assinatura" : days < 0 ? "vencido" : days === 0 ? "hoje" : days <= 7 ? "proximo" : "ativo";
    const q = search.trim().toLowerCase();
    return c.empresa_id === companyId
      && (c.nome.toLowerCase().includes(q) || (c.mac ?? "").toLowerCase().includes(q))
      && (statusFilter === "todos" || status === statusFilter)
      && (appFilter === "todos" || c.aplicativo === appFilter)
      && (planFilter === "todos" || sub?.periodicidade === planFilter)
      && (!dueFrom || (!!sub && sub.data_vencimento >= dueFrom))
      && (!dueTo || (!!sub && sub.data_vencimento <= dueTo));
  }), [clients, companyId, search, subscriptions, statusFilter, appFilter, planFilter, dueFrom, dueTo]);
  const clientSubscriptions = subscriptions.filter((sub) => clients.some((client) => client.id === sub.cliente_id && client.empresa_id === companyId));
  const monthlyRegistered = clientSubscriptions.reduce((sum, sub) => sum + Number(sub.valor || 0) / (sub.periodicidade === "trimestral" ? 3 : sub.periodicidade === "semestral" ? 6 : sub.periodicidade === "anual" ? 12 : 1), 0);
  const clientOpen = clientSubscriptions.filter(sub => sub.cobranca_status !== "recebido").reduce((sum, sub) => sum + Number(sub.valor || 0), 0);
  const clientReceived = clientSubscriptions.filter(sub => sub.cobranca_status === "recebido").reduce((sum, sub) => sum + Number(sub.valor || 0), 0);
  const companyPayments = payments.filter((p) => p.empresa_id === companyId);
  const companyExpenses = expenses.filter((e) => e.empresa_id === companyId);
  const received = companyPayments.filter((p) => p.status === "pago").reduce((sum, p) => sum + Number(p.valor), 0);
  const spent = companyExpenses.filter((e) => e.status === "pago").reduce((sum, e) => sum + Number(e.valor), 0);
  const pendingPayments = companyPayments.filter((p) => p.status !== "pago").reduce((sum, p) => sum + Number(p.valor), 0);
  const pendingExpenses = companyExpenses.filter((e) => e.status !== "pago").reduce((sum, e) => sum + Number(e.valor), 0);
  const monthKey = `${periodYear}-${String(periodMonth).padStart(2, "0")}`;
  const monthReceived = companyPayments.filter(p => p.status === "pago" && (p.data_pagamento || "").startsWith(monthKey)).reduce((sum,p) => sum + Number(p.valor), 0);
  const monthSpent = companyExpenses.filter(e => e.status === "pago" && (e.data_pagamento || "").startsWith(monthKey)).reduce((sum,e) => sum + Number(e.valor), 0);
  const monthBalance = monthReceived - monthSpent;
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
          <button disabled={busy} className="w-full rounded-xl bg-[#ed1c35] px-4 py-3 font-semibold disabled:opacity-60">{busy ? "Salvando..." : "Salvar nova senha"}</button>
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
          <button disabled={busy} className="w-full rounded-xl bg-[#ed1c35] px-4 py-3 font-semibold disabled:opacity-60">{busy ? "Entrando..." : "Entrar"}</button>
        </form>
        <p className="mt-6 text-xs leading-5 text-muted">Acesso privado. Não compartilhe sua senha ou chaves privadas.</p>
      </section>
    </main>
  );

  const nav = [{ id: "inicio" as const, label: "Visão geral", icon: LayoutDashboard }, { id: "clientes" as const, label: "Clientes", icon: Users }, { id: "financeiro" as const, label: "Financeiro", icon: Wallet }];
  const inputClass = "w-full rounded-xl border border-line bg-ink px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-[#ed1c35]";
  const field = (label: string, control: React.ReactNode) => <label className="block space-y-1.5 text-sm text-slate-300">{label}{control}</label>;

  return (
    <main className="min-h-screen md:flex">
      <aside className={`${menuOpen ? "block" : "hidden"} fixed inset-y-0 left-0 z-30 w-64 border-r border-[#35151a] bg-[#080808] p-5 md:block`}>
        <div className="mb-10"><img src={VISIONTV_LOGO} alt="VisionTV" className="h-24 w-full object-contain" /><p className="mt-1 text-center text-xs tracking-widest text-muted">GESTOR</p></div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Menu principal</p>
        <nav className="space-y-2 text-sm">{nav.map(({id,label,icon:Icon})=><button key={id} onClick={()=>{setTab(id);setMenuOpen(false);setSearch("");}} className={`flex w-full items-center gap-3 rounded-xl border-l-2 px-4 py-3 text-left transition-colors ${tab===id ? "border-[#f10d24] bg-[#321014] text-white" : "border-transparent text-slate-400 hover:bg-[#171717] hover:text-white"}`}><Icon size={18}/>{label}</button>)}</nav>
        <div className="absolute bottom-5 left-5 right-5 flex flex-col gap-3"><div className="truncate text-xs text-slate-400">{user.email}</div><button onClick={signOut} className="flex w-full items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm text-slate-300 hover:bg-[#171717]"><LogOut size={16}/> Sair</button><div className="border-t border-line pt-3 text-xs text-muted">Acesso privado • VisionTV Gestor</div></div>
      </aside>
      <section className="min-w-0 flex-1 md:ml-64">
        
        <div className="space-y-6 p-4 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">{tab==="financeiro" ? <div className="py-1"><h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Controle financeiro</h2><p className="mt-0.5 text-xs font-semibold tracking-[0.18em] text-slate-400">VISION TV</p></div> : <><h2 className="text-2xl font-bold">{tab==="inicio"?"Visão geral":"Gestão de clientes"}</h2><p className="mt-1 text-sm text-muted">Dados sincronizados com sua conta na nuvem.</p></>}</div>
            <div className="ml-auto flex flex-col items-end gap-2">
              {tab==="financeiro" && <div className="flex h-10 items-center gap-1 rounded-full border border-[#38577e] bg-[#101c2e] px-2 shadow-inner shadow-black/20"><CalendarDays size={14} className="ml-1 text-sky-300"/><select aria-label="Mês do financeiro" value={periodMonth} onChange={e=>{setPeriodMonth(Number(e.target.value));setPeriodManual(true);}} className="w-[5.7rem] appearance-none bg-transparent px-1.5 py-1 text-xs font-semibold capitalize text-slate-100 outline-none">{["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"].map((m,i)=><option className="bg-[#101c2e]" key={m} value={i+1}>{m}</option>)}</select><span className="h-4 w-px bg-[#405675]"/><select aria-label="Ano do financeiro" value={periodYear} onChange={e=>{setPeriodYear(Number(e.target.value));setPeriodManual(true);}} className="w-[3.6rem] appearance-none bg-transparent px-1 text-xs font-semibold text-slate-100 outline-none">{Array.from({length:11},(_,i)=>new Date().getFullYear()-5+i).map(y=><option className="bg-[#101c2e]" key={y} value={y}>{y}</option>)}</select><button type="button" onClick={()=>{setPeriodManual(false);setPeriodMonth(new Date().getMonth()+1);setPeriodYear(new Date().getFullYear());}} className="rounded-full bg-sky-400/10 px-2.5 py-1.5 text-[10px] font-bold text-sky-300 transition hover:bg-sky-400/20">Hoje</button></div>}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <select aria-label="Selecionar empresa" value={companyId} onChange={(e)=>setCompanyId(e.target.value)} className={inputClass+" h-9 w-auto min-w-0 max-w-32 px-2.5 py-1 text-xs"}><option value="">Empresa</option>{companies.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
                <button onClick={()=>setShowCompanyForm(true)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-line px-2.5 text-xs font-semibold hover:bg-[#171717]"><Building2 size={14}/> Empresa</button>
                <button onClick={()=>void loadData()} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:bg-[#171717]" title="Atualizar"><RefreshCw size={14}/></button>
                </div>
              </div>
          </div>
          {error && <div className="rounded-xl border border-rose-700/50 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div>}
          {notice && <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-3 text-sm text-emerald-200">{notice}</div>}
          {!companies.length && <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-5"><h3 className="font-semibold text-amber-200">Cadastre sua primeira empresa</h3><p className="mt-1 text-sm text-slate-300">Os clientes e lançamentos ficam vinculados à empresa selecionada.</p><button onClick={()=>setShowCompanyForm(true)} className="mt-3 rounded-xl bg-[#ed1c35] px-4 py-2 text-sm font-semibold"><Plus size={16} className="mr-1 inline"/> Cadastrar empresa</button></div>}
          {tab==="inicio" && <>
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              {[
                {label:"Clientes cadastrados",value:clients.filter(c=>c.empresa_id===companyId).length,detail:"Base de clientes",icon:Users,accent:"from-rose-500/20 to-rose-500/5"},
                {label:"Valor total recebido",value:money(clientReceived),detail:"Total recebido dos clientes. Controle separado do Financeiro.",icon:CreditCard,accent:"from-sky-500/20 to-sky-500/5",valueClass:"text-white"},
                
                {label:"Clientes ativos",value:clientSubscriptions.filter(sub=>sub.data_vencimento>=today() && sub.status==="ativa").length,detail:"Assinaturas dentro do prazo",icon:Activity,accent:"from-emerald-500/20 to-emerald-500/5"},
                {label:"Clientes vencidos",value:clientSubscriptions.filter(sub=>sub.data_vencimento<today()).length,detail:"Precisam de atenção",icon:CalendarDays,accent:"from-amber-500/20 to-amber-500/5"}
              ].map(({label,value,detail,icon:Icon,accent,valueClass})=><article key={label} className="group relative isolate overflow-hidden rounded-2xl border border-[#26364d] bg-gradient-to-br from-[#142238] via-[#0d1727] to-[#080d16] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-1 hover:border-[#ed1c35]/60 hover:shadow-[0_16px_40px_rgba(237,28,53,0.10)]"><div className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${accent} opacity-80`}/><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-300">{label}</p><p className={`mt-3 text-3xl font-bold tracking-tight ${valueClass || (label==="Clientes ativos" ? "text-emerald-300" : label==="Clientes vencidos" ? "text-rose-400" : "text-white")}`}>{value}</p></div><span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-black/20 text-rose-300 shadow-inner"><Icon size={20}/></span></div><div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-3"><span className="h-1.5 w-1.5 rounded-full bg-[#ed1c35]"/><p className="text-xs text-slate-400">{detail}</p></div></article>)}
            </div>
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <article className="overflow-hidden rounded-2xl border border-[#26364d] bg-gradient-to-br from-[#142238] to-[#0a111d] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.18)]"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ed1c35]/15 text-rose-300"><CreditCard size={19}/></span><div><h3 className="font-semibold text-white">Resumo dos clientes</h3><p className="text-xs text-slate-400">Indicadores da carteira</p></div></div><div className="mt-5 space-y-4"><div className="flex items-center justify-between gap-3"><span className="text-sm text-slate-400">Valor em aberto</span><b className="text-2xl font-bold text-amber-400">{money(clientOpen)}</b></div><p className="text-xs text-slate-500">Total pendente dos clientes. Controle separado do Financeiro.</p></div></article>
              <article className="overflow-hidden rounded-2xl border border-[#26364d] bg-gradient-to-br from-[#142238] to-[#0a111d] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.18)]"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ed1c35]/15 text-rose-300"><CalendarDays size={19}/></span><div><h3 className="font-semibold text-white">Próximos vencimentos</h3><p className="text-xs text-slate-400">Acompanhe as próximas renovações</p></div></div>{upcoming.length ? <div className="mt-4 divide-y divide-white/10">{upcoming.map(s=><div key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm"><div className="min-w-0"><p className="truncate font-medium text-slate-200">{clients.find(c=>c.id===s.cliente_id)?.nome ?? "Cliente"}</p><p className="mt-0.5 text-xs text-slate-400">{s.nome_plano} · {money(s.valor)}</p></div><span className="shrink-0 rounded-lg border border-[#ed1c35]/25 bg-[#ed1c35]/10 px-2.5 py-1.5 text-xs font-semibold text-rose-200">{new Date(s.data_vencimento+"T12:00:00").toLocaleDateString("pt-BR")}</span></div>)}</div> : <p className="mt-5 rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-400">Nenhuma assinatura ativa encontrada para esta empresa.</p>}</article>
            </div>
          </>}
          {tab==="clientes" && <>
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 md:p-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1"><Search size={17} className="absolute left-3 top-3 text-muted"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente por nome ou MAC" className={inputClass+" pl-9"}/></div>
                <div className="flex gap-2">
                  <button type="button" onClick={()=>setShowFilters(v=>!v)} aria-expanded={showFilters} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${showFilters?"border-rose-500 bg-[#ed1c35]/15 text-rose-200":"border-line text-slate-200 hover:bg-[#171717]"}`}><SlidersHorizontal size={17}/> Filtros <span className="rounded-full bg-slate-700 px-1.5 py-0.5 text-xs">{[statusFilter!=="todos",appFilter!=="todos",planFilter!=="todos",!!dueFrom,!!dueTo].filter(Boolean).length}</span></button>
                  <button onClick={()=>{setEditingClient(null);setClientForm({nome:"",indicacao:"",mac:"",aplicativo:"",observacoes:"",app_vencimento:"",status:"ativo",plano:"",telas:"1",valor:"",periodicidade:"mensal",vencimento:""});setShowClientForm(true)}} disabled={!companyId} className="rounded-xl bg-[#ed1c35] px-5 py-2.5 text-sm font-semibold disabled:opacity-50"><Plus size={16} className="mr-1 inline"/> Novo cliente</button>
                </div>
              </div>
              {showFilters && <div className="space-y-3 border-t border-line pt-3">
                <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wider text-muted">Filtrar clientes</p><button type="button" onClick={()=>{setStatusFilter("todos");setAppFilter("todos");setPlanFilter("todos");setDueFrom("");setDueTo("");}} className="text-xs font-semibold text-rose-300 hover:text-rose-200">Limpar filtros</button></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <label className="block space-y-1.5 text-xs text-muted">Status<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className={inputClass}><option value="todos">Todos os status</option><option value="ativo">Ativos</option><option value="proximo">Vencimento próximo</option><option value="hoje">Vence hoje</option><option value="vencido">Vencidos</option><option value="sem_assinatura">Sem assinatura</option></select></label>
                  <label className="block space-y-1.5 text-xs text-muted">Aplicativo<select value={appFilter} onChange={e=>setAppFilter(e.target.value)} className={inputClass}><option value="todos">Todos aplicativos</option>{Array.from(new Set(clients.filter(c=>c.empresa_id===companyId).map(c=>c.aplicativo).filter(Boolean))).map(a=><option key={a} value={a??""}>{a}</option>)}</select></label>
                  <label className="block space-y-1.5 text-xs text-muted">Período<select value={planFilter} onChange={e=>setPlanFilter(e.target.value)} className={inputClass}><option value="todos">Todas</option><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option></select></label>
                  <label className="block space-y-1.5 text-xs text-muted">Vencimento a partir de<input type="date" value={dueFrom} onChange={e=>setDueFrom(e.target.value)} className={inputClass}/></label>
                  <label className="block space-y-1.5 text-xs text-muted">Vencimento até<input type="date" value={dueTo} min={dueFrom || undefined} onChange={e=>setDueTo(e.target.value)} className={inputClass}/></label>
                </div>
              </div>}
              <p className="text-xs text-muted">{filteredClients.length} cliente(s) encontrado(s)</p>
            </div>
            {showClientForm && <form onSubmit={addClient} className="grid gap-3 rounded-2xl border border-line bg-panel p-5 sm:grid-cols-2">
              {field("Nome completo",<input required value={clientForm.nome} onChange={e=>setClientForm({...clientForm,nome:e.target.value})} className={inputClass}/>)}{field("Indicação",<input inputMode="numeric" value={clientForm.indicacao} onChange={e=>setClientForm({...clientForm,indicacao:e.target.value.replace(/[^0-9]/g,"")})} placeholder="Número da indicação" className={inputClass}/>)}{field("MAC",<input value={clientForm.mac} onChange={e=>setClientForm({...clientForm,mac:e.target.value})} className={inputClass}/>)}{field("Aplicativo",<input value={clientForm.aplicativo} onChange={e=>setClientForm({...clientForm,aplicativo:e.target.value})} className={inputClass}/>)}{field("Validade do app",<input type="date" value={clientForm.app_vencimento} onChange={e=>setClientForm({...clientForm,app_vencimento:e.target.value})} className={inputClass}/>)}{field("Status",<select value={clientForm.status} onChange={e=>setClientForm({...clientForm,status:e.target.value})} className={inputClass}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select>)}
              {field("Observações",<textarea value={clientForm.observacoes} onChange={e=>setClientForm({...clientForm,observacoes:e.target.value})} className={inputClass}/ >)}<div className="sm:col-span-2 border-t border-line pt-3"><p className="mb-3 text-sm font-semibold">Assinatura (opcional)</p><div className="grid gap-3 sm:grid-cols-3">{field("Plano",<input value={clientForm.plano} onChange={e=>setClientForm({...clientForm,plano:e.target.value})} placeholder="Ex.: Mensal" className={inputClass}/>)}{field("Quantidade de acessos",<input type="number" min="1" value={clientForm.telas} onChange={e=>setClientForm({...clientForm,telas:e.target.value})} className={inputClass}/>)}{field("Valor (R$)",<input type="number" min="0" step="0.01" value={clientForm.valor} onChange={e=>setClientForm({...clientForm,valor:e.target.value})} className={inputClass}/>)}{field("Vencimento",<input type="date" value={clientForm.vencimento} onChange={e=>setClientForm({...clientForm,vencimento:e.target.value})} className={inputClass}/>)}</div></div>
              <div className="flex gap-2 sm:col-span-2"><button disabled={busy} className="rounded-xl bg-[#ed1c35] px-4 py-2.5 text-sm font-semibold">{busy?"Salvando...":editingClient?"Salvar alterações":"Salvar cliente"}</button><button type="button" onClick={()=>setShowClientForm(false)} className="rounded-xl border border-line px-4 py-2.5 text-sm">Cancelar</button></div>
            </form>}
            <div className="overflow-hidden rounded-2xl border border-line bg-panel">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1350px] text-left text-sm">
                  <thead className="bg-[#142238] text-xs uppercase text-slate-100">
                    <tr>
                      <th className="p-4">Cliente</th><th className="p-4">Indicação</th><th className="p-4">Observação</th><th className="p-4">Plano</th><th className="p-4">Acesso</th><th className="p-4">Aplicativo / MAC / Validade do app</th><th className="p-4">Valor</th><th className="p-4">Vencimento</th><th className="p-4">Status</th><th className="p-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map(c=>{const sub=subscriptions.filter(s=>s.cliente_id===c.id).sort((a,b)=>b.data_vencimento.localeCompare(a.data_vencimento))[0];const days=sub?Math.ceil((new Date(sub.data_vencimento+"T12:00:00").getTime()-new Date(today()+"T12:00:00").getTime())/86400000):null;const status=!sub?"Sem assinatura":days!<0?"Vencido":days===0?"Vence hoje":days!<=7?"Vencimento próximo":"Ativo";return <tr key={c.id} className="border-t border-line align-top hover:bg-[#18304f]/50">
                      <td className="p-4"><div className="font-semibold text-white">{c.nome}</div></td>
                      <td className="p-4 font-medium text-slate-200">{c.indicacao||"—"}</td>
                      <td className="p-4 max-w-[220px] whitespace-normal text-xs text-muted">{c.observacoes||"—"}</td>
                      <td className="p-4">{sub?.nome_plano||"Sem plano"}</td>
                      <td className="p-4">{sub?sub.quantidade_telas:"—"}</td>
                      <td className="p-4"><div>{c.aplicativo||"—"}</div><div className="mt-1 text-xs text-muted">MAC: {c.mac||"—"}</div><div className="mt-1 text-xs text-muted">{c.app_vencimento?new Date(c.app_vencimento+"T12:00:00").toLocaleDateString("pt-BR"):"—"}</div></td>
                      <td className="p-4 font-semibold text-white">{sub?money(sub.valor):"—"}</td>
                      <td className="p-4">{sub?new Date(sub.data_vencimento+"T12:00:00").toLocaleDateString("pt-BR"):"—"}</td>
                      <td className="p-4"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${!sub?"bg-slate-800 text-slate-300":days!<0?"bg-rose-950 text-rose-300":days!<=7?"bg-amber-950 text-amber-300":"bg-emerald-950 text-emerald-300"}`}>{status}</span></td>
                      <td className="p-4"><div className="flex flex-col gap-2"><button onClick={()=>editClient(c)} className="rounded-lg border border-sky-500/30 px-3 py-1.5 text-sky-300 hover:bg-sky-500/10">Editar</button><button onClick={()=>void renewClient(c)} disabled={busy} className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-emerald-300 hover:bg-emerald-500/10">Renovar</button><button onClick={()=>void deleteClient(c)} className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-rose-300 hover:bg-[#ff3048]/10">Excluir</button></div></td>
                    </tr>})}
                    {!filteredClients.length&&<tr><td colSpan={11} className="p-8 text-center text-muted">Nenhum cliente encontrado nesta empresa.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>}
          {tab==="financeiro" && <>
            
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">{[{label:"Total recebido",value:money(received),hint:"Entradas já confirmadas",icon:ArrowDownCircle,color:"text-emerald-300",tone:"from-emerald-500/20"},{label:"Despesas pagas",value:money(spent),hint:"Saídas já realizadas",icon:ArrowUpCircle,color:"text-rose-300",tone:"from-rose-500/20"},{label:"A receber",value:money(pendingPayments),hint:"Recebimentos pendentes",icon:Wallet,color:"text-amber-300",tone:"from-amber-500/20"},{label:"A pagar",value:money(pendingExpenses),hint:"Despesas pendentes",icon:CreditCard,color:"text-orange-300",tone:"from-orange-500/20"},{label:"Saldo recebido",value:money(received-spent),hint:"Recebido menos despesas pagas",icon:Activity,color:received-spent>=0?"text-sky-300":"text-rose-300",tone:"from-sky-500/20"}].map(x=><article key={x.label} className="relative overflow-hidden rounded-2xl border border-[#2b3d57] bg-gradient-to-br from-[#172943] via-[#101c2e] to-[#0a1220] p-5 shadow-lg shadow-black/20"><div className={`absolute inset-0 bg-gradient-to-br ${x.tone} to-transparent opacity-70`}/><div className="relative"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-300">{x.label}</p><span className="rounded-xl bg-black/20 p-2"><x.icon size={20} className={x.color}/></span></div><p className={`mt-5 text-2xl font-extrabold tracking-tight ${x.color}`}>{x.value}</p><p className="mt-3 border-t border-white/10 pt-3 text-xs text-slate-400">{x.hint}</p></div></article>)}</div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3"><article className="rounded-2xl border border-[#2b3d57] bg-[#101c2e] p-5 lg:col-span-2"><div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-bold text-white">Movimentação do mês</h3><p className="text-xs text-slate-400">Valores pagos dentro do mês atual</p></div><span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">Resumo mensal</span></div><div className="mt-5 grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-slate-400">Entradas no mês</p><p className="mt-1 text-xl font-bold text-emerald-300">{money(monthReceived)}</p></div><div><p className="text-xs text-slate-400">Despesas no mês</p><p className="mt-1 text-xl font-bold text-rose-300">{money(monthSpent)}</p></div><div><p className="text-xs text-slate-400">Resultado do mês</p><p className={`mt-1 text-xl font-bold ${monthBalance>=0?"text-sky-300":"text-rose-300"}`}>{money(monthBalance)}</p></div></div></article><article className="rounded-2xl border border-[#2b3d57] bg-[#101c2e] p-5"><h3 className="text-lg font-bold text-white">Visão do caixa</h3><p className="mt-1 text-xs text-slate-400">Situação das movimentações</p><div className="mt-5 space-y-4"><div><div className="mb-1 flex justify-between text-xs"><span className="text-slate-400">Recebimentos confirmados</span><strong className="text-emerald-300">{companyPayments.filter(p=>p.status==="pago").length}</strong></div><div className="h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-emerald-400" style={{width:`${companyPayments.length?companyPayments.filter(p=>p.status==="pago").length/companyPayments.length*100:0}%`}}/></div></div><div><div className="mb-1 flex justify-between text-xs"><span className="text-slate-400">Despesas pagas</span><strong className="text-rose-300">{companyExpenses.filter(e=>e.status==="pago").length}</strong></div><div className="h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-rose-400" style={{width:`${companyExpenses.length?companyExpenses.filter(e=>e.status==="pago").length/companyExpenses.length*100:0}%`}}/></div></div></div></article></div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2b3d57] bg-[#0d1828] p-4"><div><h3 className="font-bold text-white">Lançamentos financeiros</h3><p className="text-xs text-slate-400">Registre e acompanhe suas entradas e saídas</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>setShowPaymentForm(!showPaymentForm)} disabled={!companyId} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/30 hover:bg-emerald-500 disabled:opacity-50"><Plus size={16} className="mr-1 inline"/> Registrar recebimento</button><button onClick={()=>setShowExpenseForm(!showExpenseForm)} disabled={!companyId} className="rounded-xl bg-[#ed1c35] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-950/30 hover:bg-rose-500 disabled:opacity-50"><Plus size={16} className="mr-1 inline"/> Registrar despesa</button></div></div>
            {showPaymentForm&&<form onSubmit={addPayment} className="grid gap-3 rounded-2xl border border-line bg-panel p-5 sm:grid-cols-2">{field("Descrição",<input value={paymentForm.descricao} onChange={e=>setPaymentForm({...paymentForm,descricao:e.target.value})} placeholder="Mensalidade, serviço..." className={inputClass}/>)}{field("Categoria",<input value={paymentForm.categoria} onChange={e=>setPaymentForm({...paymentForm,categoria:e.target.value})} placeholder="Mensalidade, serviço, venda..." className={inputClass}/>)}{field("Valor (R$)",<input required type="number" min="0.01" step="0.01" value={paymentForm.valor} onChange={e=>setPaymentForm({...paymentForm,valor:e.target.value})} className={inputClass}/>)}{field("Vencimento",<input type="date" value={paymentForm.data_vencimento} onChange={e=>setPaymentForm({...paymentForm,data_vencimento:e.target.value})} className={inputClass}/>)}{field("Forma de pagamento",<select value={paymentForm.forma_pagamento} onChange={e=>setPaymentForm({...paymentForm,forma_pagamento:e.target.value})} className={inputClass}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option><option value="outro">Outro</option></select>)}{field("Situação",<select value={paymentForm.status} onChange={e=>setPaymentForm({...paymentForm,status:e.target.value})} className={inputClass}><option value="pago">Recebido</option><option value="pendente">Pendente</option></select>)}<div className="flex gap-2 sm:col-span-2"><button disabled={busy} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold">Salvar recebimento</button><button type="button" onClick={()=>setShowPaymentForm(false)} className="rounded-xl border border-line px-4 py-2.5 text-sm">Cancelar</button></div></form>}
            {showExpenseForm&&<form onSubmit={addExpense} className="grid gap-3 rounded-2xl border border-line bg-panel p-5 sm:grid-cols-2">{field("Descrição",<input required value={expenseForm.descricao} onChange={e=>setExpenseForm({...expenseForm,descricao:e.target.value})} className={inputClass}/>)}{field("Categoria",<input value={expenseForm.categoria} onChange={e=>setExpenseForm({...expenseForm,categoria:e.target.value})} placeholder="Internet, ferramentas..." className={inputClass}/>)}{field("Valor (R$)",<input required type="number" min="0.01" step="0.01" value={expenseForm.valor} onChange={e=>setExpenseForm({...expenseForm,valor:e.target.value})} className={inputClass}/>)}{field("Vencimento",<input type="date" value={expenseForm.data_vencimento} onChange={e=>setExpenseForm({...expenseForm,data_vencimento:e.target.value})} className={inputClass}/>)}{field("Forma de pagamento",<select value={expenseForm.forma_pagamento} onChange={e=>setExpenseForm({...expenseForm,forma_pagamento:e.target.value})} className={inputClass}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option><option value="outro">Outro</option></select>)}{field("Situação",<select value={expenseForm.status} onChange={e=>setExpenseForm({...expenseForm,status:e.target.value})} className={inputClass}><option value="pendente">Pendente</option><option value="pago">Pago</option></select>)}{field("Observações",<input value={expenseForm.observacoes} onChange={e=>setExpenseForm({...expenseForm,observacoes:e.target.value})} className={inputClass}/>)}<div className="flex gap-2 sm:col-span-2"><button disabled={busy} className="rounded-xl bg-[#ed1c35] px-4 py-2.5 text-sm font-semibold">Salvar despesa</button><button type="button" onClick={()=>setShowExpenseForm(false)} className="rounded-xl border border-line px-4 py-2.5 text-sm">Cancelar</button></div></form>}
            <div className="mt-5 grid gap-5 2xl:grid-cols-2">
              <article className="overflow-hidden rounded-2xl border border-[#2b3d57] bg-gradient-to-br from-[#14243a] to-[#0a1220] shadow-xl"><div className="flex items-center justify-between border-b border-white/10 p-5"><div><h3 className="text-lg font-bold text-white">Recebimentos</h3><p className="text-xs text-slate-400">Histórico de entradas financeiras</p></div><span className="rounded-xl bg-emerald-500/10 p-3 text-emerald-300"><ArrowDownCircle size={21}/></span></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-[#1b3555] text-xs uppercase tracking-wider text-slate-200"><tr><th className="p-4">Descrição</th><th className="p-4">Categoria</th><th className="p-4">Valor</th><th className="p-4">Vencimento</th><th className="p-4">Recebido em</th><th className="p-4">Forma</th><th className="p-4">Status</th><th className="p-4"></th></tr></thead><tbody>{companyPayments.map(p=><tr key={p.id} className="border-t border-white/10 hover:bg-white/[0.03]"><td className="p-4 font-medium text-slate-200">{p.descricao||"Recebimento"}</td><td className="p-4 text-slate-300">{p.categoria||"—"}</td><td className="p-4 font-bold text-emerald-300">{money(p.valor)}</td><td className="p-4 text-slate-300">{p.data_vencimento?new Date(p.data_vencimento+"T12:00:00").toLocaleDateString("pt-BR"):"—"}</td><td className="p-4 text-slate-300">{p.data_pagamento?new Date(p.data_pagamento+"T12:00:00").toLocaleDateString("pt-BR"):"—"}</td><td className="p-4 capitalize text-slate-300">{p.forma_pagamento||"—"}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${p.status==="pago"?"bg-emerald-500/15 text-emerald-300":"bg-amber-500/15 text-amber-300"}`}>{p.status==="pago"?"Recebido":"Pendente"}</span></td><td className="p-4"><button aria-label="Excluir recebimento" onClick={()=>void deleteFinance("pagamentos",p.id)} className="rounded-lg border border-rose-500/30 p-2 text-rose-300 hover:bg-rose-500/10"><Trash2 size={15}/></button></td></tr>)}{!companyPayments.length&&<tr><td colSpan={8} className="p-8 text-center text-slate-400">Nenhum recebimento cadastrado.</td></tr>}</tbody></table></div></article>
              <article className="overflow-hidden rounded-2xl border border-[#2b3d57] bg-gradient-to-br from-[#14243a] to-[#0a1220] shadow-xl"><div className="flex items-center justify-between border-b border-white/10 p-5"><div><h3 className="text-lg font-bold text-white">Despesas</h3><p className="text-xs text-slate-400">Histórico de saídas e compromissos</p></div><span className="rounded-xl bg-rose-500/10 p-3 text-rose-300"><ArrowUpCircle size={21}/></span></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-[#1b3555] text-xs uppercase tracking-wider text-slate-200"><tr><th className="p-4">Descrição</th><th className="p-4">Categoria</th><th className="p-4">Valor</th><th className="p-4">Vencimento</th><th className="p-4">Pago em</th><th className="p-4">Status</th><th className="p-4"></th></tr></thead><tbody>{companyExpenses.map(e=><tr key={e.id} className="border-t border-white/10 hover:bg-white/[0.03]"><td className="p-4 font-medium text-slate-200">{e.descricao}</td><td className="p-4 text-slate-300">{e.categoria||"—"}</td><td className="p-4 font-bold text-rose-300">{money(e.valor)}</td><td className="p-4 text-slate-300">{e.data_vencimento?new Date(e.data_vencimento+"T12:00:00").toLocaleDateString("pt-BR"):"—"}</td><td className="p-4 text-slate-300">{e.data_pagamento?new Date(e.data_pagamento+"T12:00:00").toLocaleDateString("pt-BR"):"—"}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${e.status==="pago"?"bg-emerald-500/15 text-emerald-300":"bg-amber-500/15 text-amber-300"}`}>{e.status==="pago"?"Pago":"Pendente"}</span></td><td className="p-4"><button aria-label="Excluir despesa" onClick={()=>void deleteFinance("despesas",e.id)} className="rounded-lg border border-rose-500/30 p-2 text-rose-300 hover:bg-rose-500/10"><Trash2 size={15}/></button></td></tr>)}{!companyExpenses.length&&<tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhuma despesa cadastrada.</td></tr>}</tbody></table></div></article>
            </div>
          </>}
        </div>
      </section>
      {showCompanyForm&&<div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4"><form onSubmit={addCompany} className="w-full max-w-md rounded-2xl border border-line bg-panel p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Cadastrar empresa</h3><button type="button" onClick={()=>setShowCompanyForm(false)}><X size={18}/></button></div><label className="block text-sm text-slate-300">Nome da empresa<input required value={companyName} onChange={e=>setCompanyName(e.target.value)} className={inputClass+" mt-2"}/></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>setShowCompanyForm(false)} className="rounded-xl border border-line px-4 py-2 text-sm">Cancelar</button><button disabled={busy} className="rounded-xl bg-[#ed1c35] px-4 py-2 text-sm font-semibold">Salvar</button></div></form></div>}
    </main>
  );
}
