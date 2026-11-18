"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Activity, AlertTriangle, Archive, Building2, CalendarDays, CheckCircle2, CreditCard, LayoutDashboard,
  LogOut, Menu, Plus, RefreshCw, Search, Trash2, Users, Wallet,
  X, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, Pencil, Grid2X2, List, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from "lucide-react";

type Company = { id: string; nome: string; tipo?: string | null };
type Client = {
  id: string; empresa_id: string; nome: string; indicacao: string | null;
  mac: string | null; servidor: string | null; aplicativo: string | null; valor_aplicativo: number | null; chave: string | null; tv: string | null; observacoes: string | null;
  app_vencimento: string | null; app_vencimento2: string | null; status: string; arquivado_em: string | null;
};
type Payment = {
  id: string; empresa_id: string; cliente_id: string | null; categoria: string | null; valor: number;
  data_vencimento: string | null; data_pagamento: string | null;
  forma_pagamento: string | null; status: string; descricao: string | null; observacoes: string | null;
};
type Expense = {
  id: string; empresa_id: string; descricao: string; categoria: string | null;
  valor: number; data_vencimento: string | null; data_pagamento: string | null;
  forma_pagamento: string | null; status: string; observacoes: string | null;
};
type Subscription = {
  id: string; cliente_id: string; nome_plano: string; quantidade_telas: number;
  valor: number; periodicidade: string; data_vencimento: string; status: string;
  cobranca_status: "pago" | "recebido" | "em_aberto"; recebido_em: string | null;
};

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
const formatDate = (value: string | null) => { if (!value) return "—"; const raw = value.trim().slice(0, 10); const parts = raw.split("-"); if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`; return raw; };
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
  const [refreshSelected, setRefreshSelected] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [clientReceivedMode, setClientReceivedMode] = useState<"mensal" | "anual" | "todos">("mensal");
  const [clientReceivedMonth, setClientReceivedMonth] = useState(String(new Date().getMonth()+1).padStart(2,"0"));
  const [clientReceivedYear, setClientReceivedYear] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState("");
  const clientTableScrollRef = useRef<HTMLDivElement>(null);
  const clientTableDragRef = useRef<{ pointerId: number; startX: number; scrollLeft: number; moved: boolean } | null>(null);
  const isPointOverClientText = (cell: HTMLElement, x: number, y: number) => {
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const value = node.textContent || "";
      for (let index = 0; index < value.length; index++) {
        if (/\\s/.test(value[index])) continue;
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        for (const rect of Array.from(range.getClientRects())) {
          if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
        }
      }
    }
    return false;
  };
  const [isDraggingClientTable, setIsDraggingClientTable] = useState(false);
  const [isOverClientTableText, setIsOverClientTableText] = useState(false);
  const [clientForm, setClientForm] = useState({ nome: "", indicacao: "", mac: "", servidor: "", aplicativo: "", valor_aplicativo: "", chave: "", tv: "", observacoes: "", app_vencimento: "", app_vencimento2: "", status: "ativo", plano: "", telas: "1", valor: "", periodicidade: "mensal", vencimento: "" });
  const [paymentForm, setPaymentForm] = useState({ categoria: "", descricao: "", valor: "", data_vencimento: today(), data_pagamento: today(), forma_pagamento: "pix", status: "pago", observacoes: "" });
  const [expenseForm, setExpenseForm] = useState({ descricao: "", categoria: "", valor: "", data_vencimento: today(), data_pagamento: "", forma_pagamento: "pix", status: "pendente", observacoes: "" });
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [appFilter, setAppFilter] = useState("todos");
  const [planFilter, setPlanFilter] = useState("todos");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(10);
  const [clientView, setClientView] = useState<"list" | "grid">("list");
  const [clientSort, setClientSort] = useState("due");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [financeView, setFinanceView] = useState<"recebimentos" | "despesas">("recebimentos");
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [periodMonth, setPeriodMonth] = useState(() => new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(() => new Date().getFullYear());
  const [periodManual, setPeriodManual] = useState(false);
  const currentMonthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
  const currentMonthEnd = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10); };
  const [dateFrom, setDateFrom] = useState(currentMonthStart);
  const [dateTo, setDateTo] = useState(currentMonthEnd);
  const [appliedDateFrom, setAppliedDateFrom] = useState(currentMonthStart);
  const [appliedDateTo, setAppliedDateTo] = useState(currentMonthEnd);

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
      supabase.from("clientes").select("id,empresa_id,nome,indicacao,mac,servidor,aplicativo,valor_aplicativo,chave,tv,observacoes,app_vencimento,app_vencimento2,status,arquivado_em").order("nome"),
      supabase.from("pagamentos").select("id,empresa_id,cliente_id,categoria,valor,data_vencimento,data_pagamento,forma_pagamento,status,descricao,observacoes").order("created_at", { ascending: false }),
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
    if (editingCompanyId) {
      const { data, error } = await supabase.from("empresas").update({ nome: companyName.trim() }).eq("id", editingCompanyId).select("id,nome,tipo").single();
      if (error) setError("Não foi possível alterar a empresa: " + error.message);
      else { setCompanies(old => old.map(c => c.id === data.id ? data as Company : c)); setNotice("Dados da empresa atualizados."); setShowCompanyForm(false); setEditingCompanyId(null); setCompanyName(""); }
    } else {
      const { data, error } = await supabase.from("empresas").insert({ owner_id: user.id, nome: companyName.trim(), tipo: "empresa" }).select("id,nome,tipo").single();
      if (error) setError(error.message);
      else { setCompanies(old => [...old, data as Company]); setCompanyId(data.id); setCompanyName(""); setShowCompanyForm(false); setNotice("Empresa cadastrada."); }
    }
    setBusy(false);
  }
  function openCompanyEditor() {
    const current = companies.find(c => c.id === companyId);
    if (!current) { setError("Selecione uma empresa primeiro."); return; }
    setEditingCompanyId(current.id); setCompanyName(current.nome); setShowCompanyForm(true); setShowCompanyMenu(false);
  }
  async function deleteCompany() {
    const current = companies.find(c => c.id === companyId);
    if (!current) return;
    if (!window.confirm(`Deseja excluir a empresa "${current.nome}"? A exclusão só será permitida se não houver registros vinculados.`)) return;
    setBusy(true); setError(""); setNotice("");
    const { error } = await supabase.from("empresas").delete().eq("id", current.id);
    if (error) setError("Não foi possível excluir. Verifique se existem clientes ou lançamentos vinculados. Nenhum registro relacionado foi apagado.");
    else {
      const remaining = companies.filter(c => c.id !== current.id);
      setCompanies(remaining); setCompanyId(remaining[0]?.id || ""); setNotice("Empresa excluída.");
    }
    setBusy(false); setShowCompanyMenu(false);
  }

  async function addClient(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !companyId) { setError("Cadastre ou selecione uma empresa antes de incluir clientes."); return; }
    if (busy) return;
    const clientIdBeingEdited = editingClient;
    setBusy(true); setError(""); setNotice("");
    const payload = { owner_id: user.id, empresa_id: companyId, nome: clientForm.nome.trim(), indicacao: clientForm.indicacao.trim() || null, mac: clientForm.mac || null, servidor: clientForm.servidor || null, aplicativo: clientForm.aplicativo || null, valor_aplicativo: clientForm.valor_aplicativo ? Number(clientForm.valor_aplicativo) : null, chave: clientForm.chave || null, tv: clientForm.tv || null, observacoes: clientForm.observacoes || null, app_vencimento: clientForm.app_vencimento || null, app_vencimento2: clientForm.app_vencimento2 || null, status: clientForm.status, ...(clientIdBeingEdited ? { arquivado_em: null } : {}) };
    const request = clientIdBeingEdited ? supabase.from("clientes").update(payload).eq("id", clientIdBeingEdited) : supabase.from("clientes").insert(payload);
    const { data, error } = await request.select("id,empresa_id,nome,indicacao,mac,servidor,aplicativo,observacoes,app_vencimento,app_vencimento2,status").single();
    if (error) setError(error.message);
    else {
      if (clientForm.plano && clientForm.valor && clientForm.vencimento) {
        const currentSub = subscriptions.find(x => x.cliente_id === data.id);
        const isNewActivation = !currentSub;
        const isRenewalOrPlanChange = !!currentSub && (
          currentSub.data_vencimento !== clientForm.vencimento ||
          currentSub.nome_plano !== clientForm.plano ||
          Number(currentSub.valor) !== Number(clientForm.valor) ||
          Number(currentSub.quantidade_telas) !== Number(clientForm.telas) ||
          currentSub.periodicidade !== clientForm.periodicidade
        );
        const subscriptionPayload = {
          owner_id: user.id, empresa_id: companyId, cliente_id: data.id,
          nome_plano: clientForm.plano, quantidade_telas: Number(clientForm.telas),
          valor: Number(clientForm.valor), periodicidade: clientForm.periodicidade,
          data_inicio: today(), data_vencimento: clientForm.vencimento,
          status: "ativa",
          ...((isNewActivation || isRenewalOrPlanChange) ? { cobranca_status: "pago", recebido_em: today() } : {})
        };
        const { error: subError } = currentSub
          ? await supabase.from("assinaturas").update(subscriptionPayload).eq("id", currentSub.id)
          : await supabase.from("assinaturas").insert(subscriptionPayload);
        if (subError) setError("Cliente salvo, mas a assinatura não foi atualizada: " + subError.message);
      }
      setClients((old) => clientIdBeingEdited
        ? old.map((client) => client.id === clientIdBeingEdited ? { ...client, ...data } as Client : client)
        : [data as Client, ...old.filter((client) => client.id !== data.id)]);
      setClientForm({ nome: "", indicacao: "", mac: "", servidor: "", aplicativo: "", valor_aplicativo: "", chave: "", tv: "", observacoes: "", app_vencimento: "", app_vencimento2: "", status: "ativo", plano: "", telas: "1", valor: "", periodicidade: "mensal", vencimento: "" });
      setShowClientForm(false); setEditingClient(null); setNotice(clientIdBeingEdited ? "Cliente atualizado." : "Cliente cadastrado.");
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
      const payload = { owner_id: user.id, empresa_id: companyId, categoria: paymentForm.categoria.trim() || null, valor: amount, descricao: paymentForm.descricao.trim() || "Recebimento", data_vencimento: paymentForm.data_vencimento || today(), data_pagamento: paymentForm.status === "pago" ? (paymentForm.data_pagamento || today()) : null, forma_pagamento: paymentForm.forma_pagamento, status: paymentForm.status, observacoes: paymentForm.observacoes.trim() || null };
      const request = editingPayment ? supabase.from("pagamentos").update(payload).eq("id", editingPayment) : supabase.from("pagamentos").insert(payload);
      const { data, error } = await request.select("id,empresa_id,cliente_id,categoria,valor,data_vencimento,data_pagamento,forma_pagamento,status,descricao").single();
      if (error) throw error;
      setPayments((old) => editingPayment ? old.map(x => x.id === editingPayment ? data as Payment : x) : [data as Payment, ...old]);
      setPaymentForm({ categoria: "", descricao: "", valor: "", data_vencimento: today(), data_pagamento: today(), forma_pagamento: "pix", status: "pago", observacoes: "" });
      setShowPaymentForm(false); setNotice(editingPayment ? "Recebimento atualizado." : "Recebimento registrado com sucesso."); setEditingPayment(null);
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
      const payload = { owner_id: user.id, empresa_id: companyId, descricao: expenseForm.descricao.trim(), categoria: expenseForm.categoria.trim(), valor: amount, data_vencimento: expenseForm.data_vencimento || today(), data_pagamento: expenseForm.status === "pago" ? (expenseForm.data_pagamento || today()) : null, forma_pagamento: expenseForm.forma_pagamento, status: expenseForm.status, observacoes: expenseForm.observacoes.trim() || null };
      const request = editingExpense ? supabase.from("despesas").update(payload).eq("id", editingExpense) : supabase.from("despesas").insert(payload);
      const { data, error } = await request.select("id,empresa_id,descricao,categoria,valor,data_vencimento,data_pagamento,forma_pagamento,status,observacoes").single();
      if (error) throw error;
      setExpenses((old) => editingExpense ? old.map(x => x.id === editingExpense ? data as Expense : x) : [data as Expense, ...old]);
      setExpenseForm({ descricao: "", categoria: "", valor: "", data_vencimento: today(), data_pagamento: "", forma_pagamento: "pix", status: "pendente", observacoes: "" });
      setShowExpenseForm(false); setNotice(editingExpense ? "Despesa atualizada." : "Despesa registrada com sucesso."); setEditingExpense(null);
      await loadData();
    } catch (err) { setError("Não foi possível salvar a despesa: " + (err instanceof Error ? err.message : "erro inesperado")); }
    finally { setBusy(false); }
  }

  function editClient(client: Client) {
    const sub = subscriptions.find(x => x.cliente_id === client.id);
    setEditingClient(client.id);
    setClientForm({nome:client.nome,indicacao:client.indicacao??"",mac:client.mac??"",servidor:client.servidor??"",aplicativo:client.aplicativo??"",valor_aplicativo:client.valor_aplicativo==null?"":String(client.valor_aplicativo),chave:client.chave??"",tv:client.tv??"",observacoes:client.observacoes??"",app_vencimento:client.app_vencimento??"",app_vencimento2:client.app_vencimento2??"",status:client.status,plano:sub?.nome_plano??"",telas:String(sub?.quantidade_telas??1),valor:sub?String(sub.valor):"",periodicidade:sub?.periodicidade??"mensal",vencimento:sub?.data_vencimento??""});
    setShowClientForm(true);
  }
  async function renewClient(client: Client) {
    const sub = subscriptions.filter(x => x.cliente_id === client.id).sort((a,b) => b.data_vencimento.localeCompare(a.data_vencimento))[0];
    if (!sub) { setError("Cadastre uma assinatura antes de renovar."); return; }
    const todayDate = new Date(today() + "T12:00:00");
    const previousDueDate = new Date(sub.data_vencimento + "T12:00:00");
    const base = previousDueDate > todayDate ? previousDueDate : todayDate;
    const originalDay = base.getDate();
    base.setDate(1);
    base.setMonth(base.getMonth() + 1);
    const lastDayOfNextMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    base.setDate(Math.min(originalDay, lastDayOfNextMonth));
    const due = base.getFullYear()+"-"+String(base.getMonth()+1).padStart(2,"0")+"-"+String(base.getDate()).padStart(2,"0");
    setBusy(true); setError("");
    const { error: subscriptionError } = await supabase.from("assinaturas").update({data_vencimento:due,status:"ativa",cobranca_status:"pago",recebido_em:today()}).eq("id",sub.id);
    if (subscriptionError) { setError(subscriptionError.message); setBusy(false); return; }
    if (client.arquivado_em) {
      const { error: clientError } = await supabase.from("clientes").update({arquivado_em:null,status:"ativo"}).eq("id",client.id);
      if (clientError) {
        setError("A assinatura foi renovada, mas não foi possível retirar o cliente dos Arquivados: "+clientError.message);
        await loadData(); setBusy(false); return;
      }
    }
    setNotice("Renovação concluída. O cliente voltou à lista normal e o próximo vencimento foi definido para 30 dias a partir de hoje.");
    await loadData(); setBusy(false);
  }
  async function toggleSubscriptionReceipt(client: Client) {
    const sub = subscriptions.filter(x => x.cliente_id === client.id).sort((a,b) => b.data_vencimento.localeCompare(a.data_vencimento))[0];
    if (!sub) { setError("Este cliente ainda não possui uma assinatura."); return; }
    const alreadyReceived = sub.cobranca_status === "recebido" && !!sub.recebido_em;
    setBusy(true); setError(""); setNotice("");
    const { error } = await supabase.from("assinaturas").update({
      cobranca_status: alreadyReceived ? "em_aberto" : "recebido",
      recebido_em: alreadyReceived ? null : today()
    }).eq("id", sub.id);
    if (error) setError("Não foi possível atualizar o recebimento: " + error.message);
    else setNotice(alreadyReceived ? "Pagamento desmarcado. O valor saiu do total recebido." : "Pagamento confirmado e incluído no total recebido de hoje.");
    await loadData(); setBusy(false);
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

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = clients.filter((client) => {
      const sub = subscriptions.filter(x => x.cliente_id === client.id).sort((a,b) => b.data_vencimento.localeCompare(a.data_vencimento))[0];
      const days = sub ? Math.ceil((new Date(sub.data_vencimento+"T12:00:00").getTime()-new Date(today()+"T12:00:00").getTime())/86400000) : null;
      const status = days !== null && days <= -10 ? "arquivado" : days === null ? "sem_assinatura" : days < 0 ? "vencido" : days <= 7 ? "proximo" : "ativo";
      return client.empresa_id === companyId
        && (client.nome.toLowerCase().includes(q) || (client.mac ?? "").toLowerCase().includes(q))
        && (statusFilter === "todos" || status === statusFilter || (statusFilter === "ativo" && status === "sem_assinatura"))
        && (appFilter === "todos" || client.aplicativo === appFilter)
        && (planFilter === "todos" || sub?.periodicidade === planFilter)
        && (!dueFrom || (!!sub && sub.data_vencimento >= dueFrom))
        && (!dueTo || (!!sub && sub.data_vencimento <= dueTo));
    });
    return rows.sort((a,b) => {
      if (statusFilter === "proximo") {
        const da = subscriptions.filter(x=>x.cliente_id===a.id).map(x=>x.data_vencimento).sort().at(-1) ?? "9999-12-31";
        const db = subscriptions.filter(x=>x.cliente_id===b.id).map(x=>x.data_vencimento).sort().at(-1) ?? "9999-12-31";
        if (da !== db) return da.localeCompare(db);
      }
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [clients, companyId, search, subscriptions, statusFilter, appFilter, planFilter, dueFrom, dueTo]);
  const clientStatusCounts = useMemo(() => {
    const base = clients.filter(c => c.empresa_id === companyId);
    const daysFor = (c: Client) => { const s = subscriptions.filter(x=>x.cliente_id===c.id).sort((a,b)=>b.data_vencimento.localeCompare(a.data_vencimento))[0]; return s ? Math.ceil((new Date(s.data_vencimento+"T12:00:00").getTime()-new Date(today()+"T12:00:00").getTime())/86400000) : null; };
    return { total:base.length, archived:base.filter(c=>{const days=daysFor(c);return days!==null&&days<=-10;}).length, due:base.filter(c=>{const days=daysFor(c);return days!==null&&days>=0&&days<=7;}).length, overdue:base.filter(c=>{const days=daysFor(c);return days!==null&&days<0&&days>-10;}).length, active:base.filter(c=>{const days=daysFor(c);return days===null||days>7;}).length };
  }, [clients, subscriptions, companyId]);
  const clientPercent = (n:number) => clientStatusCounts.total ? (n/clientStatusCounts.total*100).toFixed(1).replace(".",",")+"%" : "0,0%";
  const pagedClients = useMemo(() => {
    const rows = [...filteredClients];
    if (clientSort === "name") rows.sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));
    else if (clientSort === "due") rows.sort((a,b)=>{
      const da=subscriptions.filter(s=>s.cliente_id===a.id).map(s=>s.data_vencimento).sort().at(-1)??"9999-12-31";
      const db=subscriptions.filter(s=>s.cliente_id===b.id).map(s=>s.data_vencimento).sort().at(-1)??"9999-12-31";
      return da.localeCompare(db);
    });
    const start=(clientPage-1)*clientPageSize;
    return rows.slice(start,start+clientPageSize);
  }, [filteredClients, subscriptions, clientPage, clientPageSize, clientSort]);
  const clientPageCount = Math.max(1,Math.ceil(filteredClients.length/clientPageSize));
  const clientSubscriptions = subscriptions.filter((sub) => clients.some((client) => client.id === sub.cliente_id && client.empresa_id === companyId));
  const monthlyRegistered = clientSubscriptions.reduce((sum, sub) => sum + Number(sub.valor || 0) / (sub.periodicidade === "trimestral" ? 3 : sub.periodicidade === "semestral" ? 6 : sub.periodicidade === "anual" ? 12 : 1), 0);
  // Assinaturas ativas e ainda dentro do prazo contam como recebidas.
  // Assinaturas vencidas ou inativas permanecem no valor em aberto.
  const isClientSubscriptionReceived = (sub: Subscription) => sub.status === "ativa" && sub.data_vencimento >= today();
  const clientOpen = clientSubscriptions.filter(sub => !isClientSubscriptionReceived(sub)).reduce((sum, sub) => sum + Number(sub.valor || 0), 0);
  const confirmedClientReceipts = clientSubscriptions.filter(sub => (String(sub.cobranca_status) === "recebido" || String(sub.cobranca_status) === "pago") && !!sub.recebido_em);
  const clientReceived = confirmedClientReceipts.filter(sub => {
    if (clientReceivedMode === "todos") return true;
    const [year, month] = (sub.recebido_em || "").slice(0,10).split("-");
    return year === clientReceivedYear && (clientReceivedMode === "anual" || month === clientReceivedMonth);
  }).reduce((sum, sub) => sum + Number(sub.valor || 0), 0);
  const currentReceiptYear = new Date().getFullYear();
  const clientReceiptYears = Array.from(new Set([...Array.from({length: 21}, (_, i) => String(currentReceiptYear + 10 - i)), ...confirmedClientReceipts.map(sub => (sub.recebido_em || "").slice(0,4)).filter(Boolean)])).sort((a,b)=>Number(b)-Number(a));
  const companyPayments = payments.filter((p) => p.empresa_id === companyId);
  const companyExpenses = expenses.filter((e) => e.empresa_id === companyId);
  const inDateRange = (date: string | null | undefined, from = appliedDateFrom, to = appliedDateTo) => !!date && date >= from && date <= to;
  const periodPayments = companyPayments.filter(p => p.status === "pago" && inDateRange(p.data_pagamento));
  const periodExpenses = companyExpenses.filter(e => e.status === "pago" && inDateRange(e.data_pagamento));
  const periodPendingPayments = companyPayments.filter(p => p.status !== "pago" && inDateRange(p.data_vencimento)).reduce((sum,p) => sum + Number(p.valor), 0);
  const periodPendingExpenses = companyExpenses.filter(e => e.status !== "pago" && inDateRange(e.data_vencimento)).reduce((sum,e) => sum + Number(e.valor), 0);
  const received = periodPayments.reduce((sum,p) => sum + Number(p.valor), 0);
  const spent = periodExpenses.reduce((sum,e) => sum + Number(e.valor), 0);
  const pendingPayments = periodPendingPayments;
  const pendingExpenses = periodPendingExpenses;
  const monthReceived = received;
  const monthSpent = spent;
  const monthBalance = monthReceived - monthSpent;
  const periodPaymentsList = companyPayments.filter(p => inDateRange(p.data_pagamento || p.data_vencimento));
  const periodExpensesList = companyExpenses.filter(e => inDateRange(e.data_pagamento || e.data_vencimento));
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
      <aside className={`${menuOpen ? "flex" : "hidden"} fixed inset-y-0 left-0 z-30 h-dvh w-[min(82vw,16rem)] max-w-full flex-col overflow-y-auto overscroll-contain border-r border-[#35151a] bg-[#080808] p-4 sm:p-5 md:flex md:h-screen md:w-64 md:overflow-y-auto`}>
        <div className="mb-7 shrink-0 md:mb-10"><img src={VISIONTV_LOGO} alt="VisionTV" className="h-24 w-full object-contain sm:h-28 md:h-32" /><p className="-mt-4 text-center text-xs font-semibold uppercase tracking-widest"><span className="text-white">VisionTV</span>{" "}<span className="text-[#ed1c35]">GESTOR</span></p></div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Menu principal</p>
        <nav className="shrink-0 space-y-2 text-sm">{nav.map(({id,label,icon:Icon})=><button key={id} onClick={()=>{setTab(id);setRefreshSelected(false);setMenuOpen(false);setSearch("");}} className={`flex w-full items-center gap-3 rounded-xl border-l-2 px-4 py-3 text-left transition-colors ${tab===id ? "border-[#f10d24] bg-[#321014] text-white" : "border-transparent text-slate-400 hover:bg-[#171717] hover:text-white"}`}><Icon size={18}/>{label}</button>)}<button type="button" onClick={()=>{setRefreshSelected(true);void loadData();}} disabled={busy || loading} className={`mt-2 flex w-full items-center gap-3 rounded-xl border-l-2 px-4 py-3 text-left text-sm font-semibold transition-colors disabled:opacity-50 ${refreshSelected ? "border-[#f10d24] bg-[#321014] text-white" : "border-transparent text-slate-400 hover:bg-[#171717] hover:text-white"}`}><RefreshCw size={18} className={loading || busy ? "animate-spin" : ""}/>Atualizar dados</button></nav>
        <div className="mt-auto flex shrink-0 flex-col gap-3 pt-8 md:pt-0"><div className="truncate text-xs text-slate-400">{user.email}</div><button onClick={signOut} className="flex w-full items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm text-slate-300 hover:bg-[#171717]"><LogOut size={16}/> Sair</button><div className="border-t border-line pt-3 text-xs text-muted">Acesso privado • VisionTV Gestor</div></div>
      </aside>
      <section className="min-w-0 flex-1 md:ml-64">
        
        <div className="space-y-6 p-4 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">{tab==="financeiro" ? <div className="py-1"><h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Controle financeiro</h2><p className="mt-0.5 text-xs font-semibold tracking-[0.18em] text-slate-400">VISION TV</p></div> : <><h2 className="text-2xl font-bold">{tab==="inicio"?"Visão geral":"Gestão de clientes"}</h2><p className="mt-1 text-sm text-muted">Dados sincronizados com sua conta na nuvem.</p></>}</div>
            <div className="ml-auto flex flex-col items-end gap-2">
              {tab==="financeiro" && <div className="order-2 flex flex-wrap items-end justify-end gap-2 rounded-2xl border border-[#38577e] bg-[#101c2e] p-3 shadow-inner shadow-black/20"><label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Data inicial<input aria-label="Data inicial do financeiro" type="date" value={dateFrom} max={dateTo || undefined} onChange={e=>setDateFrom(e.target.value)} className="h-9 rounded-lg border border-[#405675] bg-[#172943] px-2 text-xs font-semibold text-white outline-none focus:border-rose-500"/></label><label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Data final<input aria-label="Data final do financeiro" type="date" value={dateTo} min={dateFrom || undefined} onChange={e=>setDateTo(e.target.value)} className="h-9 rounded-lg border border-[#405675] bg-[#172943] px-2 text-xs font-semibold text-white outline-none focus:border-rose-500"/></label><button type="button" onClick={()=>{if(dateFrom && dateTo && dateFrom<=dateTo){setAppliedDateFrom(dateFrom);setAppliedDateTo(dateTo);}}} className="h-9 rounded-lg bg-gradient-to-r from-[#ed1c35] to-[#c9152b] px-4 text-xs font-bold text-white shadow-lg shadow-rose-950/30 hover:brightness-110">Filtrar</button><button type="button" onClick={()=>{const from=currentMonthStart(),to=currentMonthEnd();setDateFrom(from);setDateTo(to);setAppliedDateFrom(from);setAppliedDateTo(to);}} className="h-9 rounded-lg border border-[#405675] bg-[#172943] px-3 text-xs font-bold text-slate-200 hover:bg-[#203a59]">Este mês</button></div>}
              <div className="order-1 flex flex-wrap items-center justify-end gap-2">
                <div className="relative">
                  <button type="button" onClick={()=>setShowCompanyMenu(v=>!v)} className="group inline-flex min-h-12 max-w-[min(22rem,80vw)] items-center gap-3 rounded-2xl border border-rose-500/70 bg-gradient-to-r from-[#ed1c35] via-[#c8142c] to-[#8f0b1b] px-4 py-2.5 text-left text-sm font-bold text-white shadow-lg shadow-rose-950/40 transition hover:-translate-y-0.5 hover:brightness-110">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/20 bg-black/15"><Building2 size={19}/></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-base font-extrabold tracking-tight">{companies.find(c=>c.id===companyId)?.nome || "Selecionar empresa"}</span></span>
                    <span className={`text-lg transition-transform ${showCompanyMenu?"rotate-180":""}`}>⌄</span>
                  </button>
                  {showCompanyMenu && <div className="absolute right-0 z-40 mt-3 w-[min(24rem,88vw)] overflow-hidden rounded-[1.5rem] border-2 border-rose-500 bg-[#080a10] shadow-[0_0_0_1px_rgba(255,35,55,.25),0_0_35px_rgba(237,28,53,.45)] ring-1 ring-white/10">
                    <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#4b1019] via-[#210b12] to-[#101018] px-4 py-3 shadow-[inset_0_-14px_24px_rgba(237,28,53,.16)]">
                      <div className="absolute -right-8 -top-10 size-28 rounded-full bg-rose-600/20 blur-2xl"/>
                      <div className="relative flex items-center gap-3">
                        <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-rose-400/30 bg-rose-500/15 text-rose-200"><Building2 size={24}/></span>
                        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-rose-200/80">Empresa selecionada</p><p className="mt-1 truncate text-base font-bold text-white">{companies.find(c=>c.id===companyId)?.nome || "Nenhuma empresa"}</p></div>
                        <span className="grid size-8 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">✓</span>
                      </div>
                    </div>
                    <div className="space-y-1 p-2">
                      <p className="px-2 pb-1 pt-1 text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">Gerenciar empresa</p>
                      <button type="button" onClick={()=>{setEditingCompanyId(null);setCompanyName("");setShowCompanyForm(true);setShowCompanyMenu(false);}} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-[#17171c] to-[#0d0e13] px-2.5 py-2.5 text-left text-sm font-semibold text-slate-100 transition hover:border-rose-500/40 hover:bg-rose-500/10"><span className="grid size-9 place-items-center rounded-lg bg-rose-500/15 text-rose-300"><Plus size={18}/></span><span className="flex-1">Cadastrar empresa</span><span className="text-slate-500">›</span></button>
                      <button type="button" onClick={openCompanyEditor} className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[.035] px-3 py-3 text-left text-sm font-semibold text-slate-100 transition hover:border-sky-500/40 hover:bg-sky-500/10"><span className="grid size-9 place-items-center rounded-lg bg-sky-500/15 text-sky-300"><Pencil size={18}/></span><span className="flex-1">Editar empresa</span><span className="text-slate-500">›</span></button>
                    </div>
                    <div className="border-y border-white/10 px-3 py-2">
                      <p className="mb-2 text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">Trocar empresa</p>
                      <div className="max-h-24 space-y-1 overflow-y-auto">{companies.map(c=><button key={c.id} type="button" onClick={()=>{setCompanyId(c.id);setShowCompanyMenu(false);}} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${c.id===companyId?"bg-rose-500/15 text-rose-200":"text-slate-300 hover:bg-white/5"}`}><span className="truncate">{c.nome}</span>{c.id===companyId?<span className="text-emerald-300">✓</span>:<span className="text-slate-600">›</span>}</button>)}</div>
                    </div>
                    <div className="p-2"><button type="button" disabled={!companyId || busy} onClick={deleteCompany} className="flex w-full items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[.07] px-2.5 py-2.5 text-left text-sm font-bold text-rose-400 transition hover:border-rose-500/50 hover:bg-rose-500/15 disabled:opacity-40"><span className="grid size-9 place-items-center rounded-lg bg-rose-500/15"><Trash2 size={18}/></span><span className="flex-1">Excluir empresa</span><span>›</span></button></div>
                  </div>}
                </div>
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
                {label:"Valor total recebido",value:money(clientReceived),detail:"Recebimentos confirmados no período selecionado.",icon:CreditCard,accent:"from-sky-500/20 to-sky-500/5",valueClass:"text-white"},
                
                {label:"Clientes ativos",value:clientSubscriptions.filter(sub=>sub.data_vencimento>=today() && sub.status==="ativa").length,detail:"Assinaturas dentro do prazo",icon:Activity,accent:"from-emerald-500/20 to-emerald-500/5"},
                {label:"Clientes vencidos",value:clientSubscriptions.filter(sub=>sub.data_vencimento<today()).length,detail:"Precisam de atenção",icon:CalendarDays,accent:"from-amber-500/20 to-amber-500/5"}
              ].map(({label,value,detail,icon:Icon,accent,valueClass})=><article key={label} className="group relative isolate overflow-hidden rounded-2xl border border-[#26364d] bg-gradient-to-br from-[#142238] via-[#0d1727] to-[#080d16] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-1 hover:border-[#ed1c35]/60 hover:shadow-[0_16px_40px_rgba(237,28,53,0.10)]"><div className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${accent} opacity-80`}/><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-300">{label}</p><p className={`mt-3 text-3xl font-bold tracking-tight ${valueClass || (label==="Clientes ativos" ? "text-emerald-300" : label==="Clientes vencidos" ? "text-rose-400" : "text-white")}`}>{value}</p></div><span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-black/20 text-rose-300 shadow-inner"><Icon size={20}/></span></div><div className="mt-5 border-t border-white/10 pt-3">{label==="Valor total recebido" ? <div className="space-y-2"><div className="grid grid-cols-3 gap-1 rounded-lg bg-black/20 p-1"><button type="button" onClick={()=>setClientReceivedMode("mensal")} className={`rounded-md px-2 py-1.5 text-xs font-semibold ${clientReceivedMode==="mensal"?"bg-[#ed1c35] text-white":"text-slate-300"}`}>Mensal</button><button type="button" onClick={()=>setClientReceivedMode("anual")} className={`rounded-md px-2 py-1.5 text-xs font-semibold ${clientReceivedMode==="anual"?"bg-[#ed1c35] text-white":"text-slate-300"}`}>Anual</button><button type="button" onClick={()=>setClientReceivedMode("todos")} className={`rounded-md px-2 py-1.5 text-xs font-semibold ${clientReceivedMode==="todos"?"bg-[#ed1c35] text-white":"text-slate-300"}`}>Todos</button></div>{clientReceivedMode!=="todos"&&<div className="flex gap-2">{clientReceivedMode==="mensal"&&<select aria-label="Mês do recebimento" value={clientReceivedMonth} onChange={e=>setClientReceivedMonth(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#101c2e] px-2 py-1.5 text-xs text-slate-200">{["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"].map((m,i)=><option key={i} value={String(i+1).padStart(2,"0")}>{m}</option>)}</select>}<select aria-label="Ano do recebimento" value={clientReceivedYear} onChange={e=>setClientReceivedYear(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#101c2e] px-2 py-1.5 text-xs text-slate-200">{clientReceiptYears.map(y=><option key={y} value={y}>{y}</option>)}</select></div>}<p className="text-xs text-slate-400">{detail} {confirmedClientReceipts.length===0?"Ainda não há recebimentos com data de confirmação registrada.":""}</p></div>:<div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#ed1c35]"/><p className="text-xs text-slate-400">{detail}</p></div>}</div></article>)}
            </div>
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <article className="overflow-hidden rounded-2xl border border-[#26364d] bg-gradient-to-br from-[#142238] to-[#0a111d] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.18)]"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ed1c35]/15 text-rose-300"><CreditCard size={19}/></span><div><h3 className="font-semibold text-white">Resumo dos clientes</h3><p className="text-xs text-slate-400">Indicadores da carteira</p></div></div><div className="mt-5 space-y-4"><div className="flex items-center justify-between gap-3"><span className="text-sm text-slate-400">Valor em aberto</span><b className="text-2xl font-bold text-amber-400">{money(clientOpen)}</b></div><p className="text-xs text-slate-500">Total pendente dos clientes. Controle separado do Financeiro.</p></div></article>
              <article className="overflow-hidden rounded-2xl border border-[#26364d] bg-gradient-to-br from-[#142238] to-[#0a111d] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.18)]"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ed1c35]/15 text-rose-300"><CalendarDays size={19}/></span><div><h3 className="font-semibold text-white">Próximos vencimentos</h3><p className="text-xs text-slate-400">Acompanhe as próximas renovações</p></div></div>{upcoming.length ? <div className="mt-4 divide-y divide-white/10">{upcoming.map(s=><div key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm"><div className="min-w-0"><p className="truncate font-medium text-slate-200">{clients.find(c=>c.id===s.cliente_id)?.nome ?? "Cliente"}</p><p className="mt-0.5 text-xs text-slate-400">{s.nome_plano} · {money(s.valor)}</p></div><span className="shrink-0 rounded-lg border border-[#ed1c35]/25 bg-[#ed1c35]/10 px-2.5 py-1.5 text-xs font-semibold text-rose-200">{new Date(s.data_vencimento+"T12:00:00").toLocaleDateString("pt-BR")}</span></div>)}</div> : <p className="mt-5 rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-400">Nenhuma assinatura ativa encontrada para esta empresa.</p>}</article>
            </div>
          </>}
          {tab==="clientes" && <>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
                <article className="rounded-2xl border border-blue-500/70 bg-gradient-to-br from-blue-950/90 to-slate-950 p-4"><div className="flex items-center gap-3"><Users className="text-blue-300" size={26}/><div><p className="text-xs text-slate-300">Total de Clientes</p><p className="text-3xl font-extrabold text-white">{clientStatusCounts.total}</p></div></div></article>
                <article className="rounded-2xl border border-emerald-500/70 bg-gradient-to-br from-emerald-950/80 to-slate-950 p-4"><div className="flex items-center gap-3"><CheckCircle2 className="text-emerald-300" size={28}/><div><p className="text-xs text-slate-200">Em Dia</p><p className="flex items-baseline gap-3 text-3xl font-extrabold text-white">{clientStatusCounts.active}<span className="text-xs font-semibold text-emerald-300">{clientPercent(clientStatusCounts.active)}</span></p></div></div></article>
                <article className="rounded-2xl border border-amber-400/70 bg-gradient-to-br from-amber-950/80 to-slate-950 p-4"><div className="flex items-center gap-3"><CalendarDays className="text-amber-300" size={28}/><div><p className="text-xs text-slate-200">Vencendo (7 dias)</p><p className="flex items-baseline gap-3 text-3xl font-extrabold text-white">{String(clientStatusCounts.due).padStart(2,"0")}<span className="text-xs font-semibold text-amber-300">{clientPercent(clientStatusCounts.due)}</span></p></div></div></article>
                <article className="rounded-2xl border border-rose-500/70 bg-gradient-to-br from-rose-950/80 to-slate-950 p-4"><div className="flex items-center gap-3"><AlertTriangle className="text-rose-300" size={28}/><div><p className="text-xs text-slate-200">Vencidos</p><p className="flex items-baseline gap-3 text-3xl font-extrabold text-white">{clientStatusCounts.overdue}<span className="text-xs font-semibold text-rose-300">{clientPercent(clientStatusCounts.overdue)}</span></p></div></div></article>
                <article className="rounded-2xl border border-slate-500/70 bg-gradient-to-br from-slate-800/80 to-slate-950 p-4"><div className="flex items-center gap-3"><Archive className="text-slate-200" size={28}/><div><p className="text-xs text-slate-200">Arquivados</p><p className="text-3xl font-extrabold text-white">{String(clientStatusCounts.archived).padStart(2,"0")}</p></div></div></article>
              </div>
              <div className="flex flex-col gap-2 xl:flex-row">
                <div className="relative min-w-0 flex-1"><Search size={18} className="absolute left-3 top-3.5 text-slate-400"/><input value={search} onChange={e=>{setSearch(e.target.value);setClientPage(1)}} placeholder="Buscar cliente por nome..." className={inputClass+" rounded-xl border-[#344b68] bg-[#091525]/90 py-3 pl-10"}/></div>
                <select value={clientSort} onChange={e=>setClientSort(e.target.value)} className={inputClass+" xl:w-52"}><option value="due">Prioridade (Vencimento)</option><option value="name">Ordem alfabética</option></select>
                <button onClick={()=>{setEditingClient(null);setClientForm({nome:"",indicacao:"",mac:"",servidor:"",aplicativo:"",valor_aplicativo:"",chave:"",tv:"",observacoes:"",app_vencimento:"",app_vencimento2:"",status:"ativo",plano:"",telas:"1",valor:"",periodicidade:"mensal",vencimento:""});setShowClientForm(true)}} disabled={!companyId} className="rounded-xl bg-gradient-to-r from-[#ed1c35] to-[#c9152b] px-5 py-3 text-sm font-bold text-white"><Plus size={16} className="mr-1 inline"/> Novo cliente</button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[{id:"todos",label:"Todos",count:clientStatusCounts.total,cls:"border-rose-500 bg-gradient-to-r from-rose-600 to-red-700 text-white"},{id:"ativo",label:"Em Dia",count:clientStatusCounts.active,cls:"border-emerald-500/70 bg-emerald-500/10 text-emerald-200"},{id:"proximo",label:"Vencendo",count:clientStatusCounts.due,cls:"border-amber-500/70 bg-amber-500/10 text-amber-200"},{id:"vencido",label:"Vencido",count:clientStatusCounts.overdue,cls:"border-rose-500/70 bg-rose-500/10 text-rose-200"},{id:"arquivado",label:"Arquivado",count:clientStatusCounts.archived,cls:"border-slate-500/70 bg-slate-500/10 text-slate-200"}].map(x=><button key={x.id} onClick={()=>{setStatusFilter(x.id);setClientPage(1)}} className={`rounded-xl border px-3 py-3 text-sm font-bold ${statusFilter===x.id?x.cls:"border-[#344b68] bg-[#0b192b] text-slate-400"}`}>{x.label}</button>)}
              </div>
              {showFilters&&<div className="grid gap-3 rounded-xl border border-[#344b68] bg-[#0b192b] p-4 sm:grid-cols-2 xl:grid-cols-4">
                <label className="text-xs text-slate-400">Aplicativo<select value={appFilter} onChange={e=>setAppFilter(e.target.value)} className={inputClass}><option value="todos">Todos</option>{Array.from(new Set(clients.filter(x=>x.empresa_id===companyId).map(x=>x.aplicativo).filter(Boolean))).map(x=><option key={x} value={x??""}>{x}</option>)}</select></label>
                <label className="text-xs text-slate-400">Plano<select value={planFilter} onChange={e=>setPlanFilter(e.target.value)} className={inputClass}><option value="todos">Todos</option><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option></select></label>
                <label className="text-xs text-slate-400">Vencimento a partir de<input type="date" value={dueFrom} onChange={e=>setDueFrom(e.target.value)} className={inputClass}/></label>
                <label className="text-xs text-slate-400">Vencimento até<input type="date" value={dueTo} min={dueFrom||undefined} onChange={e=>setDueTo(e.target.value)} className={inputClass}/></label>
              </div>}
            </div>
            <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#2b3d57] bg-gradient-to-br from-[#101e31] to-[#091321] shadow-xl shadow-black/20">
              <div
                ref={clientTableScrollRef}
                className={`w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin] ${isDraggingClientTable ? "cursor-grabbing" : isOverClientTableText ? "cursor-text" : "cursor-grab"}`}
                style={{ touchAction: "auto", WebkitOverflowScrolling: "touch" }}
                onPointerDown={(event) => {
                  // No celular/tablet, preservar a rolagem horizontal nativa por toque.
                  if (event.pointerType !== "mouse") return;
                  if (event.button !== 0) return;
                  const target = event.target as HTMLElement;
                  if (target.closest("button, a, input, select, textarea")) return;
                  const cell = target.closest("td, th");
                  if (cell && isPointOverClientText(cell as HTMLElement, event.clientX, event.clientY)) return;
                  clientTableDragRef.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft, moved: false };
                }}
                onPointerMove={(event) => {
                  // O gesto touch é tratado pela rolagem nativa do navegador.
                  if (event.pointerType !== "mouse") return;
                  const drag = clientTableDragRef.current;
                  if (!drag || drag.pointerId !== event.pointerId) {
                    const target = event.target as HTMLElement;
                    const cell = target.closest("td, th");
                    setIsOverClientTableText(!!cell && isPointOverClientText(cell as HTMLElement, event.clientX, event.clientY));
                    return;
                  }
                  const delta = event.clientX - drag.startX;
                  if (!drag.moved && Math.abs(delta) > 6) {
                    drag.moved = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setIsDraggingClientTable(true);
                  }
                  if (drag.moved) {
                    event.preventDefault();
                    event.currentTarget.scrollLeft = drag.scrollLeft - delta;
                  }
                }}
                onPointerUp={(event) => {
                  if (clientTableDragRef.current?.pointerId === event.pointerId) {
                    clientTableDragRef.current = null;
                    setIsDraggingClientTable(false);
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onPointerCancel={() => { clientTableDragRef.current = null; setIsDraggingClientTable(false); }}
                onLostPointerCapture={() => { clientTableDragRef.current = null; setIsDraggingClientTable(false); }}
              >
                <table className="w-full min-w-[1200px] table-fixed text-center text-sm">
                  <colgroup><col style={{width:"9%"}}/><col style={{width:"9%"}}/><col style={{width:"9%"}}/><col style={{width:"8%"}}/><col style={{width:"5%"}}/><col style={{width:"9%"}}/><col style={{width:"13%"}}/><col style={{width:"7%"}}/><col style={{width:"8%"}}/><col style={{width:"13%"}}/><col style={{width:"10%"}}/></colgroup>
                  <thead className="bg-gradient-to-r from-[#7f1021] to-[#a51028] text-[13px] font-bold uppercase tracking-wide text-white">
                    <tr>
                      <th className="px-3 py-3 text-left">Cliente</th><th className="px-3 py-3">Indicação</th><th className="px-4 py-3 text-left">Observação</th><th className="px-2 py-3">Plano</th><th className="px-2 py-3">Acesso</th><th className="px-3 py-3">Servidor</th><th className="px-3 py-3 text-left">Aplicativo</th><th className="px-2 py-3">Valor</th><th className="px-2 py-3">Vencimento</th><th className="px-2 py-3">Status</th><th className="px-2 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                                        {showClientForm && !editingClient && <tr><td colSpan={11} className="p-4"><form onSubmit={addClient} className="w-full rounded-2xl border border-[#344b68] bg-[#0b192b] p-6 shadow-lg shadow-black/20">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                <div className="lg:col-span-2">{field("Nome completo",<input required value={clientForm.nome} onChange={e=>setClientForm({...clientForm,nome:e.target.value})} placeholder="Nome completo do cliente" className={inputClass+" min-h-11"}/>)}</div>
                {field("Plano",<input value={clientForm.plano} onChange={e=>setClientForm({...clientForm,plano:e.target.value})} placeholder="Ex.: Mensal" className={inputClass}/>)}
                {field("Quantidade de acessos",<input type="number" min="1" value={clientForm.telas} onChange={e=>setClientForm({...clientForm,telas:e.target.value})} className={inputClass}/>)}
                {field("Valor (R$)",<input type="number" min="0" step="0.01" value={clientForm.valor} onChange={e=>setClientForm({...clientForm,valor:e.target.value})} className={inputClass}/>)}
                {field("Vencimento",<input type="date" value={clientForm.vencimento} onChange={e=>setClientForm({...clientForm,vencimento:e.target.value})} className={inputClass}/>)}
                {field("Indicação",<input inputMode="numeric" value={clientForm.indicacao} onChange={e=>setClientForm({...clientForm,indicacao:e.target.value.replace(/[^0-9]/g,"")})} placeholder="Número da indicação" className={inputClass}/>)}
              </div>
              <div className="my-5 border-t border-[#344b68] pt-4">
                <p className="mb-3 text-sm font-semibold text-white">Informações do aplicativo</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {field("Servidor",<input value={clientForm.servidor} onChange={e=>setClientForm({...clientForm,servidor:e.target.value})} placeholder="Nome ou endereço do servidor" className={inputClass}/>)}
                  {field("Aplicativo",<input value={clientForm.aplicativo} onChange={e=>setClientForm({...clientForm,aplicativo:e.target.value})} className={inputClass}/>)}
                  {field("Valor do aplicativo (R$)",<input type="number" min="0" step="0.01" value={clientForm.valor_aplicativo} onChange={e=>setClientForm({...clientForm,valor_aplicativo:e.target.value})} className={inputClass}/>)}
                  {field("TV",<input value={clientForm.tv} onChange={e=>setClientForm({...clientForm,tv:e.target.value})} className={inputClass}/>)}
                  {field("Validade do aplicativo",<div className="grid grid-cols-2 gap-2"><div><span className="mb-1 block text-xs text-muted">Data 1</span><input type="date" value={clientForm.app_vencimento} onChange={e=>setClientForm({...clientForm,app_vencimento:e.target.value})} className={inputClass}/></div><div><span className="mb-1 block text-xs text-muted">Data 2</span><input type="date" value={clientForm.app_vencimento2} onChange={e=>setClientForm({...clientForm,app_vencimento2:e.target.value})} className={inputClass}/></div></div>)}
                  {field("MAC",<input value={clientForm.mac} onChange={e=>setClientForm({...clientForm,mac:e.target.value})} className={inputClass}/>)}
                  {field("Chave",<input value={clientForm.chave} onChange={e=>setClientForm({...clientForm,chave:e.target.value})} className={inputClass}/>)}
                  {field("Status",<select value={clientForm.status} onChange={e=>setClientForm({...clientForm,status:e.target.value})} className={inputClass}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select>)}
                  <div className="lg:col-span-2">{field("Observações",<textarea rows={3} value={clientForm.observacoes} onChange={e=>setClientForm({...clientForm,observacoes:e.target.value})} placeholder="Digite observações completas..." className={inputClass+" min-h-24 resize-y"}/>)}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2"><button disabled={busy} className="rounded-xl bg-[#ed1c35] px-4 py-2.5 text-sm font-semibold">{busy?"Salvando...":editingClient?"Salvar alterações":"Salvar cliente"}</button><button type="button" onClick={()=>setShowClientForm(false)} className="rounded-xl border border-line px-4 py-2.5 text-sm">Cancelar</button></div>
            </form></td></tr>}
                    {pagedClients.map(c=>{const sub=subscriptions.filter(s=>s.cliente_id===c.id).sort((a,b)=>b.data_vencimento.localeCompare(a.data_vencimento))[0];const days=sub?Math.ceil((new Date(sub.data_vencimento+"T12:00:00").getTime()-new Date(today()+"T12:00:00").getTime())/86400000):null;const status=!sub?"Sem assinatura":days!<0?"Vencido":days===0?"Vence hoje":days!<=7?"Vencimento próximo":"Ativo";return <><tr key={c.id} className="border-t border-white/[0.07] align-top text-sm transition-colors hover:bg-[#203a59]/35">
                      <td className="px-3 py-3 text-left align-middle"><div className="whitespace-normal break-words font-semibold leading-6 text-white">{c.nome}</div></td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">{c.indicacao||"—"}</td>
                      <td className="max-w-[280px] px-4 py-3 text-left text-xs leading-5 text-slate-300"><div className="whitespace-normal break-words">{c.observacoes||"—"}</div></td>
                      
                      
                      <td className="px-3 py-3 whitespace-normal break-words">{sub?.nome_plano||"Sem plano"}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{sub?sub.quantidade_telas:"—"}</td>
                      <td className="px-3 py-3 whitespace-normal break-words">{c.servidor||"—"}</td>
                      <td className="px-3 py-3 whitespace-normal break-words text-left text-sm leading-6">{c.aplicativo||"—"}</td>
                      
                      <td className="px-3 py-3 whitespace-nowrap font-bold text-emerald-400">{sub?money(sub.valor):"—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{sub?new Date(sub.data_vencimento+"T12:00:00").toLocaleDateString("pt-BR"):"—"}</td>
                      <td className="px-3 py-3 text-center align-middle"><span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${!sub?"bg-slate-800 text-slate-300":days!<0?"bg-rose-950 text-rose-300":days!<=7?"bg-amber-950 text-amber-300":"bg-emerald-950 text-emerald-300"}`}>{status}</span></td>
                      <td className="px-2 py-3 whitespace-nowrap"><div className="flex items-center justify-center gap-1.5"><button title="Editar cliente" aria-label="Editar cliente" onClick={()=>editClient(c)} className="shrink-0 rounded-lg border border-sky-400/25 bg-sky-500/10 p-1.5 text-sky-300 transition hover:border-sky-400/60 hover:bg-sky-500/20"><Pencil size={15}/></button><button title={subscriptions.filter(x=>x.cliente_id===c.id).sort((a,b)=>b.data_vencimento.localeCompare(a.data_vencimento))[0]?.cobranca_status==="recebido" && !!subscriptions.filter(x=>x.cliente_id===c.id).sort((a,b)=>b.data_vencimento.localeCompare(a.data_vencimento))[0]?.recebido_em ? "Desmarcar pagamento recebido" : "Marcar pagamento como recebido"} aria-label="Alternar pagamento recebido" onClick={()=>void toggleSubscriptionReceipt(c)} disabled={busy} className="shrink-0 rounded-lg border border-amber-400/25 bg-amber-500/10 p-1.5 text-amber-300 transition hover:border-amber-400/60 hover:bg-amber-500/20 disabled:opacity-40"><CheckCircle2 size={15}/></button><button title="Renovar cliente" aria-label="Renovar cliente" onClick={()=>void renewClient(c)} disabled={busy} className="shrink-0 rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-1.5 text-emerald-300 transition hover:border-emerald-400/60 hover:bg-emerald-500/20 disabled:opacity-40"><RefreshCw size={15}/></button><button title="Excluir cliente" aria-label="Excluir cliente" onClick={()=>void deleteClient(c)} className="shrink-0 rounded-lg border border-rose-400/25 bg-rose-500/10 p-1.5 text-rose-300 transition hover:border-rose-400/60 hover:bg-rose-500/20"><Trash2 size={15}/></button></div></td>
                    </tr>
                    {showClientForm && editingClient === c.id && <tr><td colSpan={9} className="p-4"><form onSubmit={addClient} className="w-full rounded-2xl border border-[#344b68] bg-[#0b192b] p-6 shadow-lg shadow-black/20">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                <div className="lg:col-span-2">{field("Nome completo",<input required value={clientForm.nome} onChange={e=>setClientForm({...clientForm,nome:e.target.value})} placeholder="Nome completo do cliente" className={inputClass+" min-h-11"}/>)}</div>
                {field("Plano",<input value={clientForm.plano} onChange={e=>setClientForm({...clientForm,plano:e.target.value})} placeholder="Ex.: Mensal" className={inputClass}/>)}
                {field("Quantidade de acessos",<input type="number" min="1" value={clientForm.telas} onChange={e=>setClientForm({...clientForm,telas:e.target.value})} className={inputClass}/>)}
                {field("Valor (R$)",<input type="number" min="0" step="0.01" value={clientForm.valor} onChange={e=>setClientForm({...clientForm,valor:e.target.value})} className={inputClass}/>)}
                {field("Vencimento",<input type="date" value={clientForm.vencimento} onChange={e=>setClientForm({...clientForm,vencimento:e.target.value})} className={inputClass}/>)}
                {field("Indicação",<input inputMode="numeric" value={clientForm.indicacao} onChange={e=>setClientForm({...clientForm,indicacao:e.target.value.replace(/[^0-9]/g,"")})} placeholder="Número da indicação" className={inputClass}/>)}
              </div>
              <div className="my-5 border-t border-[#344b68] pt-4">
                <p className="mb-3 text-sm font-semibold text-white">Informações do aplicativo</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {field("Servidor",<input value={clientForm.servidor} onChange={e=>setClientForm({...clientForm,servidor:e.target.value})} placeholder="Nome ou endereço do servidor" className={inputClass}/>)}
                  {field("Aplicativo",<input value={clientForm.aplicativo} onChange={e=>setClientForm({...clientForm,aplicativo:e.target.value})} className={inputClass}/>)}
                  {field("Valor do aplicativo (R$)",<input type="number" min="0" step="0.01" value={clientForm.valor_aplicativo} onChange={e=>setClientForm({...clientForm,valor_aplicativo:e.target.value})} className={inputClass}/>)}
                  {field("TV",<input value={clientForm.tv} onChange={e=>setClientForm({...clientForm,tv:e.target.value})} className={inputClass}/>)}
                  {field("Validade do aplicativo",<div className="grid grid-cols-2 gap-2"><div><span className="mb-1 block text-xs text-muted">Data 1</span><input type="date" value={clientForm.app_vencimento} onChange={e=>setClientForm({...clientForm,app_vencimento:e.target.value})} className={inputClass}/></div><div><span className="mb-1 block text-xs text-muted">Data 2</span><input type="date" value={clientForm.app_vencimento2} onChange={e=>setClientForm({...clientForm,app_vencimento2:e.target.value})} className={inputClass}/></div></div>)}
                  {field("MAC",<input value={clientForm.mac} onChange={e=>setClientForm({...clientForm,mac:e.target.value})} className={inputClass}/>)}
                  {field("Chave",<input value={clientForm.chave} onChange={e=>setClientForm({...clientForm,chave:e.target.value})} className={inputClass}/>)}
                  {field("Status",<select value={clientForm.status} onChange={e=>setClientForm({...clientForm,status:e.target.value})} className={inputClass}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select>)}
                  <div className="lg:col-span-2">{field("Observações",<textarea rows={3} value={clientForm.observacoes} onChange={e=>setClientForm({...clientForm,observacoes:e.target.value})} placeholder="Digite observações completas..." className={inputClass+" min-h-24 resize-y"}/>)}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2"><button disabled={busy} className="rounded-xl bg-[#ed1c35] px-4 py-2.5 text-sm font-semibold">{busy?"Salvando...":editingClient?"Salvar alterações":"Salvar cliente"}</button><button type="button" onClick={()=>setShowClientForm(false)} className="rounded-xl border border-line px-4 py-2.5 text-sm">Cancelar</button></div>
            </form></td></tr>}
                    </>})}
                    {!filteredClients.length&&<tr><td colSpan={11} className="p-8 text-center text-muted">Nenhum cliente encontrado nesta empresa.</td></tr>}
                  </tbody>
                </table>
              <div className="flex flex-col gap-3 border-t border-[#344b68] bg-[#080e18] p-3 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                <span>Mostrando {filteredClients.length?((clientPage-1)*clientPageSize+1):0} a {Math.min(clientPage*clientPageSize,filteredClients.length)} de {filteredClients.length} clientes</span>
                <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2">Linhas por página:<select value={clientPageSize} onChange={e=>{setClientPageSize(Number(e.target.value));setClientPage(1)}} className="rounded-lg border border-[#344b68] bg-[#111c2c] px-2 py-1.5 text-white"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label>
                  <button disabled={clientPage===1} onClick={()=>setClientPage(1)} className="rounded-lg border border-[#344b68] p-2 disabled:opacity-30"><ChevronsLeft size={15}/></button><button disabled={clientPage===1} onClick={()=>setClientPage(p=>Math.max(1,p-1))} className="rounded-lg border border-[#344b68] p-2 disabled:opacity-30"><ChevronLeft size={15}/></button><span className="px-2">{clientPage} / {clientPageCount}</span><button disabled={clientPage===clientPageCount} onClick={()=>setClientPage(p=>Math.min(clientPageCount,p+1))} className="rounded-lg border border-[#344b68] p-2 disabled:opacity-30"><ChevronRight size={15}/></button><button disabled={clientPage===clientPageCount} onClick={()=>setClientPage(clientPageCount)} className="rounded-lg border border-[#344b68] p-2 disabled:opacity-30"><ChevronsRight size={15}/></button>
                </div>
              </div>
              </div>
            </div>
          </>}
          {tab==="financeiro" && <>
            
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">{[{label:"Total recebido",value:money(received),hint:"Entradas confirmadas no período",icon:ArrowDownCircle,color:"text-emerald-300",tone:"from-emerald-500/20"},{label:"Despesas pagas",value:money(spent),hint:"Despesas pagas no período",icon:ArrowUpCircle,color:"text-rose-300",tone:"from-rose-500/20"},{label:"A receber",value:money(pendingPayments),hint:"Pendentes com vencimento no período",icon:Wallet,color:"text-amber-300",tone:"from-amber-500/20"},{label:"A pagar",value:money(pendingExpenses),hint:"Pendentes com vencimento no período",icon:CreditCard,color:"text-orange-300",tone:"from-orange-500/20"},{label:"Saldo recebido",value:money(received-spent),hint:"Recebido menos despesas pagas no período",icon:Activity,color:received-spent>=0?"text-sky-300":"text-rose-300",tone:"from-sky-500/20"}].map(x=><article key={x.label} className="relative overflow-hidden rounded-2xl border border-[#2b3d57] bg-gradient-to-br from-[#172943] via-[#101c2e] to-[#0a1220] p-5 shadow-lg shadow-black/20"><div className={`absolute inset-0 bg-gradient-to-br ${x.tone} to-transparent opacity-70`}/><div className="relative"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-300">{x.label}</p><span className="rounded-xl bg-black/20 p-2"><x.icon size={20} className={x.color}/></span></div><p className={`mt-5 text-2xl font-extrabold tracking-tight ${x.color}`}>{x.value}</p><p className="mt-3 border-t border-white/10 pt-3 text-xs text-slate-400">{x.hint}</p></div></article>)}</div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3"><article className="rounded-2xl border border-[#2b3d57] bg-[#101c2e] p-5 lg:col-span-2"><div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-bold text-white">Movimentação do mês</h3><p className="text-xs text-slate-400">Valores pagos dentro do período selecionado</p></div><span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">Período selecionado</span></div><div className="mt-5 grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-slate-400">Entradas no mês</p><p className="mt-1 text-xl font-bold text-emerald-300">{money(monthReceived)}</p></div><div><p className="text-xs text-slate-400">Despesas no mês</p><p className="mt-1 text-xl font-bold text-rose-300">{money(monthSpent)}</p></div><div><p className="text-xs text-slate-400">Resultado do mês</p><p className={`mt-1 text-xl font-bold ${monthBalance>=0?"text-sky-300":"text-rose-300"}`}>{money(monthBalance)}</p></div></div></article><article className="rounded-2xl border border-[#2b3d57] bg-[#101c2e] p-5"><h3 className="text-lg font-bold text-white">Visão do caixa</h3><p className="mt-1 text-xs text-slate-400">Situação das movimentações</p><div className="mt-5 space-y-4"><div><div className="mb-1 flex justify-between text-xs"><span className="text-slate-400">Recebimentos confirmados</span><strong className="text-emerald-300">{periodPayments.length}</strong></div><div className="h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-emerald-400" style={{width:`${periodPaymentsList.length?periodPayments.length/periodPaymentsList.length*100:0}%`}}/></div></div><div><div className="mb-1 flex justify-between text-xs"><span className="text-slate-400">Despesas pagas</span><strong className="text-rose-300">{periodExpenses.length}</strong></div><div className="h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-rose-400" style={{width:`${periodExpensesList.length?periodExpenses.length/periodExpensesList.length*100:0}%`}}/></div></div></div></article></div>
            <article className="mt-6 overflow-hidden rounded-2xl border border-[#2b3d57] bg-gradient-to-br from-[#14243a] to-[#0a1220] shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0d1828] p-4"><div><h3 className="font-bold text-white">Lançamentos financeiros</h3><p className="text-xs text-slate-400">Registre e acompanhe suas entradas e saídas</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>setShowPaymentForm(!showPaymentForm)} disabled={!companyId} className="inline-flex h-10 w-36 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950/30 transition hover:bg-emerald-500 disabled:opacity-50"><Plus size={13}/> Recebimento</button><button onClick={()=>setShowExpenseForm(!showExpenseForm)} disabled={!companyId} className="inline-flex h-10 w-36 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#ed1c35] px-3 py-2 text-xs font-bold text-white shadow-md shadow-rose-950/30 transition hover:bg-rose-500 disabled:opacity-50"><Plus size={13}/> Despesa</button></div></div>
            {showPaymentForm&&<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4"><form onSubmit={addPayment} className="my-auto w-full max-w-3xl rounded-2xl border border-[#3b5274] bg-gradient-to-br from-[#1b3555] to-[#101c2e] p-5 shadow-2xl sm:p-7"><div className="mb-6 flex items-center justify-between"><h3 className="text-xl font-bold text-white">{editingPayment?"Editar recebimento":"Novo recebimento"}</h3><button type="button" onClick={()=>{setShowPaymentForm(false);setEditingPayment(null);}} className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"><X size={18}/></button></div><div className="grid gap-4 sm:grid-cols-2">{field("Descrição",<input value={paymentForm.descricao} onChange={e=>setPaymentForm({...paymentForm,descricao:e.target.value})} placeholder="Ex.: Pagamento de cliente" className={`${inputClass} !bg-[#29466b] !border-[#6685a8] text-white placeholder:text-slate-300 focus:!border-sky-300 focus:!ring-2 focus:!ring-sky-400/30`}/>)}{field("Categoria",<input value={paymentForm.categoria} onChange={e=>setPaymentForm({...paymentForm,categoria:e.target.value})} placeholder="Ex.: Vendas, serviço, mensalidade" className={`${inputClass} !bg-[#29466b] !border-[#6685a8] text-white placeholder:text-slate-300 focus:!border-sky-300 focus:!ring-2 focus:!ring-sky-400/30`}/>)}{field("Valor (R$)",<input required type="number" min="0.01" step="0.01" value={paymentForm.valor} onChange={e=>setPaymentForm({...paymentForm,valor:e.target.value})} placeholder="0,00" className={`${inputClass} !bg-[#29466b] !border-[#6685a8] text-white placeholder:text-slate-300 focus:!border-sky-300 focus:!ring-2 focus:!ring-sky-400/30`}/>)}{field("Data do lançamento",<input required type="date" value={paymentForm.data_pagamento} onChange={e=>setPaymentForm({...paymentForm,data_pagamento:e.target.value})} className={`${inputClass} !bg-[#29466b] !border-[#6685a8] text-white placeholder:text-slate-300 focus:!border-sky-300 focus:!ring-2 focus:!ring-sky-400/30`}/>)}{field("Vencimento (opcional)",<input type="date" value={paymentForm.data_vencimento} onChange={e=>setPaymentForm({...paymentForm,data_vencimento:e.target.value})} className={`${inputClass} !bg-[#29466b] !border-[#6685a8] text-white placeholder:text-slate-300 focus:!border-sky-300 focus:!ring-2 focus:!ring-sky-400/30`}/>)}{field("Forma de pagamento",<select value={paymentForm.forma_pagamento} onChange={e=>setPaymentForm({...paymentForm,forma_pagamento:e.target.value})} className={`${inputClass} !bg-[#29466b] !border-[#6685a8] text-white placeholder:text-slate-300 focus:!border-sky-300 focus:!ring-2 focus:!ring-sky-400/30`}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option><option value="outro">Outro</option></select>)}{field("Situação",<select value={paymentForm.status} onChange={e=>setPaymentForm({...paymentForm,status:e.target.value})} className={`${inputClass} !bg-[#29466b] !border-[#6685a8] text-white placeholder:text-slate-300 focus:!border-sky-300 focus:!ring-2 focus:!ring-sky-400/30`}><option value="pago">Pago / recebido</option><option value="pendente">Pendente</option></select>)}<div className="sm:col-span-2">{field("Observações (opcional)",<textarea value={paymentForm.observacoes} onChange={e=>setPaymentForm({...paymentForm,observacoes:e.target.value})} placeholder="Informações adicionais" rows={3} className={`${inputClass} !bg-[#29466b] !border-[#6685a8] text-white placeholder:text-slate-300 focus:!border-sky-300 focus:!ring-2 focus:!ring-sky-400/30`}/>)}</div></div><div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={()=>{setShowPaymentForm(false);setEditingPayment(null);}} className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">Cancelar</button><button disabled={busy} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50">Salvar recebimento</button></div></form></div>}
            {showExpenseForm&&<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4"><form onSubmit={addExpense} className="my-auto w-full max-w-3xl rounded-2xl border border-[#3b5274] bg-gradient-to-br from-[#1b3555] to-[#101c2e] p-5 shadow-2xl sm:p-7"><div className="mb-6 flex items-center justify-between"><h3 className="text-xl font-bold text-white">{editingExpense?"Editar despesa":"Nova despesa"}</h3><button type="button" onClick={()=>{setShowExpenseForm(false);setEditingExpense(null);}} className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"><X size={18}/></button></div><div className="grid gap-4 sm:grid-cols-2">{field("Descrição",<input required value={expenseForm.descricao} onChange={e=>setExpenseForm({...expenseForm,descricao:e.target.value})} placeholder="Ex.: Compra de material" className={`${inputClass} !bg-[#29466b] !border-[#6685a8] text-white placeholder:text-slate-300 focus:!border-sky-300 focus:!ring-2 focus:!ring-sky-400/30`}/>)}{field("Categoria",<input required value={expenseForm.categoria} onChange={e=>setExpenseForm({...expenseForm,categoria:e.target.value})} placeholder="Ex.: Internet, ferramentas" className={`${inputClass} !bg-[#29466b] !border-[#6685a8] text-white placeholder:text-slate-300 focus:!border-sky-300 focus:!ring-2 focus:!ring-sky-400/30`}/>)}{field("Valor (R$)",<input required type="number" min="0.01" step="0.01" value={expenseForm.valor} onChange={e=>setExpenseForm({...expenseForm,valor:e.target.value})} placeholder="0,00" className={`${inputClass} !bg-[#29466b] !border-[#6685a8] text-white placeholder:text-slate-300 focus:!border-sky-300 focus:!ring-2 focus:!ring-sky-400/30`}/>)}{field("Data do lançamento",<input required type="date" value={expenseForm.data_pagamento||today()} onChange={e=>setExpenseForm({...expenseForm,data_pagamento:e.target.value})} className={`${inputClass} !bg-[#29466b] !border-[#6685a8] text-white placeholder:text-slate-300 focus:!border-sky-300 focus:!ring-2 focus:!ring-sky-400/30`}/>)}{field("Vencimento (opcional)",<input type="date" value={expenseForm.data_vencimento} onChange={e=>setExpenseForm({...expenseForm,data_vencimento:e.target.value})} className={`${inputClass} !bg-[#29466b] !border-[#6685a8] text-white placeholder:text-slate-300 focus:!border-sky-300 focus:!ring-2 focus:!ring-sky-400/30`}/>)}{field("Forma de pagamento",<select value={expenseForm.forma_pagamento} onChange={e=>setExpenseForm({...expenseForm,forma_pagamento:e.target.value})} className={`${inputClass} !bg-[#29466b] !border-[#6685a8] text-white placeholder:text-slate-300 focus:!border-sky-300 focus:!ring-2 focus:!ring-sky-400/30`}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option><option value="outro">Outro</option></select>)}{field("Situação",<select value={expenseForm.status} onChange={e=>setExpenseForm({...expenseForm,status:e.target.value})} className={`${inputClass} !bg-[#29466b] !border-[#6685a8] text-white placeholder:text-slate-300 focus:!border-sky-300 focus:!ring-2 focus:!ring-sky-400/30`}><option value="pendente">Pendente</option><option value="pago">Pago</option></select>)}<div className="sm:col-span-2">{field("Observações (opcional)",<textarea value={expenseForm.observacoes} onChange={e=>setExpenseForm({...expenseForm,observacoes:e.target.value})} placeholder="Informações adicionais" rows={3} className={`${inputClass} !bg-[#29466b] !border-[#6685a8] text-white placeholder:text-slate-300 focus:!border-sky-300 focus:!ring-2 focus:!ring-sky-400/30`}/>)}</div></div><div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={()=>{setShowExpenseForm(false);setEditingExpense(null);}} className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">Cancelar</button><button disabled={busy} className="rounded-xl bg-[#ed1c35] px-5 py-3 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-50">Salvar despesa</button></div></form></div>}
            <div className="border-t border-white/10">              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-base">
                  <thead className="bg-[#1b3555] text-base font-bold uppercase tracking-wide text-slate-100"><tr>
                    <th className="whitespace-nowrap px-3 py-4 text-center align-middle">Tipo</th><th className="whitespace-nowrap px-3 py-4 text-left align-middle">Descrição</th><th className="whitespace-nowrap px-3 py-4 text-left align-middle">Categoria</th><th className="whitespace-nowrap px-3 py-4 text-center align-middle">Valor</th><th className="whitespace-nowrap px-3 py-4 text-center align-middle">Vencimento</th><th className="whitespace-nowrap px-3 py-4 text-center align-middle">Recebido / pago em</th><th className="whitespace-nowrap px-3 py-4 text-center align-middle">Forma</th><th className="whitespace-nowrap px-3 py-4 text-center align-middle">Status</th><th className="whitespace-nowrap px-3 py-4 text-center align-middle">Ações</th>
                  </tr></thead>
                  <tbody>
                    {periodPaymentsList.map(p=><tr key={`recebimento-${p.id}`} className="border-t border-white/10 hover:bg-white/[0.03]">
                      <td className="px-3 py-4 text-center align-middle"><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">Recebimento</span></td>
                      <td className="px-3 py-4 text-left align-middle">{p.descricao||"Recebimento"}</td><td className="px-3 py-4 text-left align-middle">{p.categoria||"—"}</td><td className="px-3 py-4 text-center align-middle font-bold text-emerald-300">{money(p.valor)}</td>
                      <td className="px-3 py-4 text-center align-middle">{formatDate(p.data_vencimento)}</td><td className="px-3 py-4 text-center align-middle">{formatDate(p.data_pagamento)}</td><td className="px-3 py-4 text-center align-middle">{p.forma_pagamento||"—"}</td>
                      <td className="px-3 py-4 text-center align-middle"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${p.status==="pago"?"bg-emerald-500/10 text-emerald-300":"bg-amber-500/10 text-amber-300"}`}>{p.status==="pago"?"Recebido":"Pendente"}</span></td>
                      <td className="px-3 py-4 text-center align-middle"><div className="flex justify-center gap-1.5">
                        <button title="Editar" onClick={()=>{setEditingPayment(p.id);setPaymentForm({descricao:p.descricao||"",categoria:p.categoria||"",valor:String(p.valor),data_vencimento:p.data_vencimento||today(),data_pagamento:p.data_pagamento||today(),forma_pagamento:p.forma_pagamento||"pix",status:p.status,observacoes:p.observacoes||""});setShowPaymentForm(true);setShowExpenseForm(false);}} className="rounded-md border border-sky-500/30 p-1.5 text-sky-300 hover:bg-sky-500/10"><Pencil size={14}/></button>
                        <button title="Excluir" onClick={()=>void deleteFinance("pagamentos",p.id)} className="rounded-md border border-rose-500/30 p-1.5 text-rose-300 hover:bg-rose-500/10"><Trash2 size={14}/></button>
                      </div></td>
                    </tr>)}
                    {periodExpensesList.map(e=><tr key={`despesa-${e.id}`} className="border-t border-white/10 hover:bg-white/[0.03]">
                      <td className="px-3 py-4 text-center align-middle"><span className="rounded-full bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-300">Despesa</span></td>
                      <td className="px-3 py-4 text-left align-middle">{e.descricao}</td><td className="px-3 py-4 text-left align-middle">{e.categoria||"—"}</td><td className="px-3 py-4 text-center align-middle font-bold text-rose-300">{money(e.valor)}</td>
                      <td className="px-3 py-4 text-center align-middle">{formatDate(e.data_vencimento)}</td><td className="px-3 py-4 text-center align-middle">{formatDate(e.data_pagamento)}</td><td className="px-3 py-4 text-center align-middle">{e.forma_pagamento||"—"}</td>
                      <td className="px-3 py-4 text-center align-middle"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${e.status==="pago"?"bg-emerald-500/10 text-emerald-300":"bg-amber-500/10 text-amber-300"}`}>{e.status==="pago"?"Pago":"Pendente"}</span></td>
                      <td className="px-3 py-4 text-center align-middle"><div className="flex justify-center gap-1.5">
                        <button title="Editar" onClick={()=>{setEditingExpense(e.id);setExpenseForm({descricao:e.descricao,categoria:e.categoria||"",valor:String(e.valor),data_vencimento:e.data_vencimento||today(),data_pagamento:e.data_pagamento||"",forma_pagamento:e.forma_pagamento||"pix",status:e.status,observacoes:e.observacoes||""});setShowExpenseForm(true);setShowPaymentForm(false);}} className="rounded-md border border-sky-500/30 p-1.5 text-sky-300 hover:bg-sky-500/10"><Pencil size={14}/></button>
                        <button title="Excluir" onClick={()=>void deleteFinance("despesas",e.id)} className="rounded-md border border-rose-500/30 p-1.5 text-rose-300 hover:bg-rose-500/10"><Trash2 size={14}/></button>
                      </div></td>
                    </tr>)}
                    {!companyPayments.length&&!companyExpenses.length&&<tr><td colSpan={9} className="p-8 text-center text-slate-400">Nenhuma movimentação cadastrada.</td></tr>}
                  </tbody>
                </table>
              </div>
              </div>
            </article>
          </>}
        </div>
      </section>
      {showCompanyForm&&<div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4"><form onSubmit={addCompany} className="w-full max-w-md rounded-2xl border border-line bg-panel p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">{editingCompanyId ? "Editar empresa" : "Cadastrar empresa"}</h3><button type="button" onClick={()=>{setShowCompanyForm(false);setEditingCompanyId(null);setCompanyName("");}}><X size={18}/></button></div><label className="block text-sm text-slate-300">Nome da empresa<input required value={companyName} onChange={e=>setCompanyName(e.target.value)} className={inputClass+" mt-2"}/></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>{setShowCompanyForm(false);setEditingCompanyId(null);setCompanyName("");}} className="rounded-xl border border-line px-4 py-2 text-sm">Cancelar</button><button disabled={busy} className="rounded-xl bg-[#ed1c35] px-4 py-2 text-sm font-semibold">Salvar</button></div></form></div>}
    </main>
  );
}
