import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BarChart3, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useAuthStore } from '../features/auth/store';
import { bankApi } from '../shared/api/bank';
import { LoadingState } from '../shared/components/State';
import { AdminAlert, FraudTransaction, User } from '../shared/types/bank';
import { money } from './LoanApplicationPage';

type AdminForm = { firstName: string; lastName: string; email: string; password: string };
const initialAdminForm: AdminForm = { firstName: '', lastName: '', email: '', password: '' };

export function AdminPage() {
  const qc = useQueryClient();
  const currentUser = useAuthStore(state => state.user);
  const [form, setForm] = useState<AdminForm>(initialAdminForm);
  const [formError, setFormError] = useState<string | null>(null);
  const users = useQuery({ queryKey: ['adminUsers'], queryFn: bankApi.adminUsers });
  const analytics = useQuery({ queryKey: ['adminAnalytics'], queryFn: bankApi.adminAnalytics });
  const transactions = useQuery({ queryKey: ['adminFraudTransactions'], queryFn: bankApi.adminFraudTransactions });
  const role = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => bankApi.updateRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminUsers'] });
      qc.invalidateQueries({ queryKey: ['adminAnalytics'] });
    }
  });
  const review = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'SAFE' | 'SUSPICIOUS' }) => bankApi.adminReviewFraud(id, status, 'Проверено администратором'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminFraudTransactions'] });
      qc.invalidateQueries({ queryKey: ['adminAnalytics'] });
    }
  });
  const createAdmin = useMutation({
    mutationFn: bankApi.createAdmin,
    onSuccess: () => {
      setForm(initialAdminForm);
      setFormError(null);
      qc.invalidateQueries({ queryKey: ['adminUsers'] });
      qc.invalidateQueries({ queryKey: ['adminAnalytics'] });
    },
    onError: error => setFormError(error instanceof Error ? error.message : 'Не удалось создать администратора')
  });

  const sortedUsers = useMemo(() => [...(users.data ?? [])].sort((a, b) => Number(b.roles.includes('ADMIN')) - Number(a.roles.includes('ADMIN')) || a.email.localeCompare(b.email)), [users.data]);
  const highRiskTransactions = useMemo(() => (transactions.data ?? []).filter(item => item.suspicious || item.status === 'SUSPICIOUS').slice(0, 6), [transactions.data]);

  if (users.isLoading || analytics.isLoading || transactions.isLoading) return <LoadingState />;

  const data = analytics.data;
  const handleCreateAdmin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (form.password.length < 8) {
      setFormError('Пароль администратора должен быть не короче 8 символов');
      return;
    }
    createAdmin.mutate(form);
  };

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-[2rem] bg-ink p-6 text-white shadow-soft lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-white/70"><ShieldCheck className="h-4 w-4" /> Banking control room</p>
          <h2 className="text-3xl font-black sm:text-5xl">Админ-панель Boys Bank</h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">Упрощенная версия банковского back office: управление доступом, мониторинг операций, продуктовая аналитика, риск-события, SLA по заявкам и быстрые действия для администраторов.</p>
        </div>
        <div className="rounded-3xl bg-white/10 p-4">
          <p className="text-sm text-white/60">Текущий администратор</p>
          <p className="mt-1 text-xl font-black">{currentUser?.firstName} {currentUser?.lastName}</p>
          <p className="text-sm text-white/60">{currentUser?.email}</p>
        </div>
      </div>
    </section>

    {data && <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Клиенты" value={data.totalUsers} helper={`${data.totalAdmins} админ.`} />
        <Metric label="Средства на счетах" value={money(data.totalBalance)} helper={`${data.totalAccounts} счетов`} />
        <Metric label="Оборот операций" value={money(data.totalTransactionVolume)} helper={`${data.totalTransactions} операций`} />
        <Metric label="Риск-события" value={data.suspiciousTransactions} helper={`${data.newFraudReviews} новых проверок`} danger={data.suspiciousTransactions > 0 || data.newFraudReviews > 0} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        <ProductCard title="Карты" primary={`${data.activeCards} активных`} secondary={`${data.blockedCards} заблокировано · всего ${data.totalCards}`} progress={ratio(data.activeCards, data.totalCards)} />
        <ProductCard title="Кредитный портфель" primary={money(data.loanPortfolio)} secondary={`${data.pendingLoans} заявок ожидают решения`} progress={ratio(data.totalTransactions, Math.max(data.totalTransactions + data.pendingLoans, 1))} />
        <ProductCard title="Вклады" primary={money(data.depositPortfolio)} secondary={`${data.activeDeposits} активных вкладов`} progress={ratio(data.activeDeposits, Math.max(data.activeDeposits + data.pendingLoans, 1))} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="card">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-sm font-bold uppercase tracking-[0.2em] text-black/40">Операционная аналитика</p><h3 className="text-2xl font-black">Динамика за 7 дней</h3></div>
            <span className="badge">Сегодня: {data.transactionsToday} · {money(data.transactionVolumeToday)}</span>
          </div>
          <div className="flex h-64 items-end gap-3 rounded-3xl bg-black/[0.03] p-4">
            {data.dailyMetrics.map(item => <DailyBar key={item.date} label={formatDay(item.date)} value={item.volume} count={item.operations} max={Math.max(...data.dailyMetrics.map(metric => metric.volume), 1)} />)}
          </div>
        </div>
        <div className="card">
          <div className="mb-5 flex items-center gap-3"><BarChart3 className="h-5 w-5" /><h3 className="text-2xl font-black">Структура операций</h3></div>
          <Breakdown items={data.transactionsByType} />
          <div className="mt-6 border-t border-black/5 pt-5"><p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-black/40">Роли</p><Breakdown items={data.usersByRole} /></div>
        </div>
      </section>

      <section className="card">
        <div className="mb-5 flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-amber-600" /><h3 className="text-2xl font-black">Центр внимания</h3></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.alerts.map(alert => <AlertCard alert={alert} key={`${alert.title}-${alert.severity}`} />)}</div>
      </section>
    </>}

    <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="card">
        <div className="mb-5 flex items-center gap-3"><UserPlus className="h-5 w-5" /><h3 className="text-2xl font-black">Создать администратора</h3></div>
        <p className="mb-5 text-sm leading-6 text-black/55">Регистрация администратора доступна только из защищенной админ-панели. Новый пользователь сразу получает роль ADMIN.</p>
        <form className="space-y-3" onSubmit={handleCreateAdmin}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" placeholder="Имя" value={form.firstName} onChange={event => setForm({ ...form, firstName: event.target.value })} required />
            <input className="input" placeholder="Фамилия" value={form.lastName} onChange={event => setForm({ ...form, lastName: event.target.value })} required />
          </div>
          <input className="input" placeholder="admin@example.com" type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} required />
          <input className="input" placeholder="Временный пароль" type="password" minLength={8} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} required />
          {formError && <p className="text-sm font-semibold text-red-600">{formError}</p>}
          <button className="btn w-full" disabled={createAdmin.isPending}>Создать ADMIN</button>
        </form>
      </section>

      <section className="card">
        <div className="mb-5 flex items-center gap-3"><UsersRound className="h-5 w-5" /><h3 className="text-2xl font-black">Пользователи и роли</h3></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b text-black/45"><th className="pb-3">Пользователь</th><th className="pb-3">Роль</th><th className="pb-3">Дата регистрации</th><th className="pb-3 text-right">Действие</th></tr></thead><tbody>{sortedUsers.map(user => <UserRow user={user} currentUserId={currentUser?.id} pending={role.isPending} onToggleRole={(nextRole) => role.mutate({ id: user.id, role: nextRole })} key={user.id} />)}</tbody></table></div>
      </section>
    </section>

    <section className="card">
      <h2 className="mb-2 text-3xl font-black">Антифрод-мониторинг</h2>
      <p className="mb-5 text-black/55">Администратор видит риск-скоринг операций, причину срабатывания и может закрывать проверку с итоговым статусом.</p>
      <div className="space-y-3">{highRiskTransactions.length > 0 ? highRiskTransactions.map(item => <FraudCard item={item} pending={review.isPending} onReview={(status) => review.mutate({ id: item.id, status })} key={item.id} />) : <p className="rounded-3xl bg-green-50 p-4 text-sm font-semibold text-green-700">Подозрительных операций сейчас нет.</p>}</div>
    </section>
  </div>;
}

function Metric({ label, value, helper, danger = false }: { label: string; value: number | string; helper: string; danger?: boolean }) {
  return <div className="card"><p className="text-sm text-black/50">{label}</p><p className={`mt-2 text-3xl font-black ${danger ? 'text-red-600' : ''}`}>{value}</p><p className="mt-2 text-sm text-black/45">{helper}</p></div>;
}

function ProductCard({ title, primary, secondary, progress }: { title: string; primary: string; secondary: string; progress: number }) {
  return <div className="card"><p className="text-sm text-black/50">{title}</p><p className="mt-2 text-2xl font-black">{primary}</p><p className="mt-1 text-sm text-black/45">{secondary}</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-ink" style={{ width: `${Math.round(progress * 100)}%` }} /></div></div>;
}

function DailyBar({ label, value, count, max }: { label: string; value: number; count: number; max: number }) {
  const height = Math.max(10, Math.round((value / max) * 100));
  return <div className="flex flex-1 flex-col items-center justify-end gap-2 text-center"><p className="text-[10px] font-bold text-black/40">{count}</p><div className="w-full rounded-t-2xl bg-fintech transition-all" style={{ height: `${height}%` }} title={money(value)} /><p className="text-[10px] font-bold text-black/45">{label}</p></div>;
}

function Breakdown({ items }: { items: Record<string, number> }) {
  const entries = Object.entries(items);
  const max = Math.max(...entries.map(([, value]) => value), 1);
  if (!entries.length) return <p className="text-sm text-black/45">Нет данных</p>;
  return <div className="space-y-3">{entries.map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{label}</span><span className="text-black/45">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(8, (value / max) * 100)}%` }} /></div></div>)}</div>;
}

function AlertCard({ alert }: { alert: AdminAlert }) {
  const tone = alert.severity === 'high' ? 'border-red-200 bg-red-50 text-red-700' : alert.severity === 'medium' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-green-200 bg-green-50 text-green-700';
  return <article className={`rounded-3xl border p-4 ${tone}`}><p className="font-black">{alert.title}</p><p className="mt-2 text-sm opacity-80">{alert.description}</p><p className="mt-4 text-xs font-black uppercase tracking-[0.18em] opacity-60">{alert.actionLabel}</p></article>;
}

function UserRow({ user, currentUserId, pending, onToggleRole }: { user: User; currentUserId?: number; pending: boolean; onToggleRole: (role: 'USER' | 'ADMIN') => void }) {
  const isAdmin = user.roles.includes('ADMIN');
  const isSelf = user.id === currentUserId;
  const disabled = pending || (isSelf && isAdmin);
  return <tr className="border-t border-black/5"><td className="py-4"><b>{user.firstName} {user.lastName}</b><p className="text-black/50">{user.email}</p>{isSelf && <span className="mt-1 inline-block rounded-full bg-fintech px-2 py-0.5 text-[10px] font-bold">это вы</span>}</td><td><span className={isAdmin ? 'badge bg-ink text-white' : 'badge'}>{user.roles.join(', ')}</span></td><td className="text-black/50">{new Date(user.createdAt).toLocaleDateString('ru-RU')}</td><td className="text-right"><button className="btn-secondary" disabled={disabled} title={isSelf && isAdmin ? 'Нельзя снять права администратора у собственной учетной записи' : undefined} onClick={() => onToggleRole(isAdmin ? 'USER' : 'ADMIN')}>{isAdmin ? 'Сделать USER' : 'Сделать ADMIN'}</button>{isSelf && isAdmin && <p className="mt-1 text-xs text-black/40">саморазжалование запрещено</p>}</td></tr>;
}

function FraudCard({ item, pending, onReview }: { item: FraudTransaction; pending: boolean; onReview: (status: 'SAFE' | 'SUSPICIOUS') => void }) {
  return <article className="rounded-3xl border border-black/10 p-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div><div className="flex flex-wrap items-center gap-2"><b>{money(item.transaction.amount)}</b><span className={`badge ${item.suspicious ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>risk {item.riskScore}</span><span className="badge">{item.status}</span></div><p className="mt-2 text-sm text-black/60">{item.reason}</p><p className="mt-1 text-xs text-black/40">{item.transaction.description || 'Без описания'} · {new Date(item.transaction.createdAt).toLocaleString('ru-RU')}</p></div>
      <div className="flex gap-2"><button className="btn-secondary" disabled={pending} onClick={() => onReview('SAFE')}>Безопасно</button><button className="btn" disabled={pending} onClick={() => onReview('SUSPICIOUS')}>Подозрительно</button></div>
    </div>
  </article>;
}

function ratio(value: number, total: number) {
  if (!total) return 0;
  return Math.min(1, Math.max(0, value / total));
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(new Date(date));
}
