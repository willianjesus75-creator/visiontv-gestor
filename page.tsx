"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Activity, Building2, CreditCard, LayoutDashboard, LogOut,
  Menu, Users, Wallet, CalendarClock, CircleAlert
} from "lucide-react";

type Counts = { empresas: number; clientes: number; assinaturas: number; pagamentos: number; despesas: number };
const initial: Counts = { empresas: 0, clientes: 0, assinaturas: 0, pagamentos: 0, despesas: 0 };

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts>(initial);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user.email ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user.email ?? null);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (user) loadCounts();
  }, [user]);

  async function loadCounts() {
    const tables: (keyof Counts)[] = ["empresas", "clientes", "assinaturas", "pagamentos", "despesas"];
    const values = await Promise.all(tables.map(async (table) => {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
      return [table, error ? 0 : (count ?? 0)] as const;
    }));
    setCounts(Object.fromEntries(values) as Counts);
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Não foi possível entrar. Confira seu e-mail e senha e tente novamente.");
    setBusy(false);
  }

  async function signOut() { await supabase.auth.signOut(); setUser(null); }

  if (loading) return <main className="min-h-screen grid place-items-center text-slate-400">Carregando VisionTV Gestor...</main>;

  if (!user) return (
    <main className="min-h-screen flex items-center justify-center p-5">
      <section className="w-full max-w-md rounded-3xl border border-line bg-panel p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-600"><Activity size={25}/></div>
          <div><h1 className="text-2xl font-bold">VisionTV Gestor</h1><p className="text-sm text-muted">Gestão em um só lugar</p></div>
        </div>
        <h2 className="mb-2 text-xl font-semibold">Acessar sua conta</h2>
        <p className="mb-6 text-sm text-muted">Entre com o usuário cadastrado no Supabase Authentication.</p>
        <form onSubmit={signIn} className="space-y-4">
          <label className="block text-sm text-slate-300">E-mail
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required className="mt-2 w-full rounded-xl border border-line bg-ink px-4 py-3 outline-none focus:border-rose-500"/>
          </label>
          <label className="block text-sm text-slate-300">Senha
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required className="mt-2 w-full rounded-xl border border-line bg-ink px-4 py-3 outline-none focus:border-rose-500"/>
          </label>
          {error && <p className="rounded-xl bg-rose-950/60 p-3 text-sm text-rose-300">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-rose-600 px-4 py-3 font-semibold hover:bg-rose-500 disabled:opacity-60">{busy ? "Entrando..." : "Entrar"}</button>
        </form>
        <p className="mt-6 text-xs leading-5 text-muted">A conta deve ser criada previamente em Supabase → Authentication → Users. Não compartilhe sua senha ou chaves privadas.</p>
      </section>
    </main>
  );

  const cards = [
    { label: "Empresas", value: counts.empresas, icon: Building2, desc: "Empresas cadastradas" },
    { label: "Clientes", value: counts.clientes, icon: Users, desc: "Clientes cadastrados" },
    { label: "Assinaturas", value: counts.assinaturas, icon: CreditCard, desc: "Registros de assinatura" },
    { label: "Pagamentos", value: counts.pagamentos, icon: Wallet, desc: "Lançamentos registrados" },
    { label: "Despesas", value: counts.despesas, icon: CalendarClock, desc: "Despesas registradas" }
  ];

  return (
    <main className="min-h-screen md:flex">
      <aside className={`${menuOpen ? "block" : "hidden"} fixed inset-y-0 left-0 z-20 w-64 border-r border-line bg-[#0d1421] p-5 md:block`}>
        <div className="mb-10 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-600"><Activity/></div><div><b>VisionTV</b><p className="text-xs text-muted">GESTOR</p></div></div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Menu principal</p>
        <nav className="space-y-2 text-sm">
          <div className="flex items-center gap-3 rounded-xl bg-rose-600/15 px-4 py-3 text-rose-300"><LayoutDashboard size={18}/> Visão geral</div>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-400"><Building2 size={18}/> Empresas</div>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-400"><Users size={18}/> Clientes</div>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-400"><CreditCard size={18}/> Assinaturas</div>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-400"><Wallet size={18}/> Financeiro</div>
        </nav>
        <div className="absolute bottom-5 left-5 right-5 text-xs text-muted">Acesso privado • VisionTV Gestor</div>
      </aside>
      <section className="min-w-0 flex-1 md:ml-64">
        <header className="flex items-center justify-between border-b border-line bg-[#0d1421] px-5 py-4 md:px-8">
          <button onClick={()=>setMenuOpen(!menuOpen)} className="rounded-lg border border-line p-2 md:hidden" aria-label="Abrir menu"><Menu size={19}/></button>
          <div><p className="text-sm text-muted">Painel de controle</p><h1 className="text-xl font-bold">Visão geral</h1></div>
          <div className="flex items-center gap-3"><span className="hidden text-sm text-muted sm:block">{user}</span><button onClick={signOut} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"><LogOut size={16}/> Sair</button></div>
        </header>
        <div className="p-5 md:p-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-bold">Bem-vindo ao VisionTV Gestor</h2><p className="mt-1 text-sm text-muted">Resumo dos registros do seu sistema.</p></div><button onClick={loadCounts} className="rounded-xl border border-line px-4 py-2 text-sm hover:bg-slate-800">Atualizar dados</button></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map(({label,value,icon:Icon,desc})=><article key={label} className="rounded-2xl border border-line bg-panel p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted">{label}</span><span className="rounded-xl bg-slate-800 p-2 text-rose-300"><Icon size={19}/></span></div><p className="mt-4 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-muted">{desc}</p></article>)}
          </div>
          <div className="mt-6 rounded-2xl border border-amber-700/40 bg-amber-950/20 p-5">
            <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 text-amber-400" size={20}/><div><h3 className="font-semibold text-amber-200">Configuração inicial</h3><p className="mt-1 text-sm leading-6 text-slate-300">Esta é a base inicial do painel. Os menus de cadastro, vencimentos e lançamentos serão conectados às colunas reais do seu banco antes de liberar o uso operacional.</p></div></div>
          </div>
        </div>
      </section>
    </main>
  );
}
