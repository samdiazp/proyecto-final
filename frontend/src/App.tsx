import { type FormEvent, useEffect, useState } from "react";

import { trpc } from "./trpc";

type Resource = {
  resourceId: string;
  name: string;
  description?: string | null;
  spots: number;
  availableSpots: number;
  reservationDate: string;
};

type Reservation = {
  reservationId: string;
  resourceId: string;
  resourceName: string;
  reservationDate: string;
  spots: number;
  status: "CONFIRMED" | "CANCELED";
};

type Reminder = {
  reservationId: string;
  resourceName: string;
  status: "SENT";
  sentAt: string;
};

type Session = {
  token: string;
  user: {
    id: string;
    fullname: string;
    email: string;
  };
};

const sessionKey = "bookslot-session";

const readSession = (): Session | null => {
  const saved = window.localStorage.getItem(sessionKey);

  if (!saved) {
    return null;
  }

  try {
    return JSON.parse(saved) as Session;
  } catch {
    window.localStorage.removeItem(sessionKey);
    return null;
  }
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo completar la operación";

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

export default function App() {
  const [session, setSession] = useState<Session | null>(readSession);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [authBusy, setAuthBusy] = useState(false);
  const [busyResourceId, setBusyResourceId] = useState<string | null>(null);
  const [busyReservationId, setBusyReservationId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshDashboard() {
    try {
      const resourcesResponse = await trpc.getResources.query();
      setResources((resourcesResponse.resources ?? []) as Resource[]);

      if (session) {
        const [reservationsResponse, remindersResponse] = await Promise.all([
          trpc.getUserReservations.query(),
          trpc.getUserReminders.query(),
        ]);
        setReservations((reservationsResponse.reservations ?? []) as Reservation[]);
        setReminders((remindersResponse.reminders ?? []) as Reminder[]);
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  useEffect(() => {
    if (!session) {
      return;
    }

    void refreshDashboard();
    const interval = window.setInterval(() => void refreshDashboard(), 10_000);

    return () => window.clearInterval(interval);
  }, [session]);

  async function handleAuthentication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setError(null);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      if (authMode === "register") {
        await trpc.register.mutate({
          fullname: String(form.get("fullname") ?? ""),
          email,
          password,
        });
        setAuthMode("login");
        setMessage("Cuenta creada. Ya puedes iniciar sesión.");
      } else {
        const response = await trpc.login.mutate({ email, password });
        const nextSession = response as Session;

        window.localStorage.setItem("bookslot-token", nextSession.token);
        window.localStorage.setItem(sessionKey, JSON.stringify(nextSession));
        setSession(nextSession);
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setAuthBusy(false);
    }
  }

  async function reserve(resourceId: string) {
    setBusyResourceId(resourceId);
    setError(null);
    setMessage(null);

    try {
      await trpc.createReservation.mutate({
        resourceId,
        spots: 1,
      });
      setMessage("Tu plaza ha quedado confirmada.");
      await refreshDashboard();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusyResourceId(null);
    }
  }

  async function cancel(reservationId: string) {
    setBusyReservationId(reservationId);
    setError(null);
    setMessage(null);

    try {
      await trpc.cancelReservation.mutate({ reservationId });
      setMessage("La reserva se ha cancelado y la plaza vuelve a estar disponible.");
      await refreshDashboard();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusyReservationId(null);
    }
  }

  function logout() {
    window.localStorage.removeItem("bookslot-token");
    window.localStorage.removeItem(sessionKey);
    setSession(null);
    setResources([]);
    setReservations([]);
    setReminders([]);
    setMessage(null);
    setError(null);
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-copy">
          <p className="eyebrow">BOOKSLOT</p>
          <h1>Reserva tu sitio sin esperar.</h1>
          <p>
            Consulta el aforo disponible y asegura tu plaza en unos segundos.
          </p>
        </section>

        <section className="auth-card" aria-label="Autenticación">
          <div className="auth-heading">
            <p className="eyebrow">ACCESO</p>
            <h2>{authMode === "login" ? "Bienvenido" : "Crea tu cuenta"}</h2>
          </div>

          <form onSubmit={handleAuthentication} className="form-stack">
            {authMode === "register" && (
              <label>
                Nombre completo
                <input name="fullname" minLength={1} required autoComplete="name" />
              </label>
            )}
            <label>
              Email
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              Contraseña
              <input
                name="password"
                type="password"
                minLength={6}
                required
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
              />
            </label>
            <button className="button button-primary" disabled={authBusy}>
              {authBusy
                ? "Un momento..."
                : authMode === "login"
                  ? "Entrar"
                  : "Registrarme"}
            </button>
          </form>

          <button
            className="text-button"
            type="button"
            onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
          >
            {authMode === "login" ? "¿No tienes cuenta? Regístrate" : "Ya tengo cuenta"}
          </button>
          {message && <p className="notice notice-success">{message}</p>}
          {error && <p className="notice notice-error">{error}</p>}
        </section>
      </main>
    );
  }

  const reservedResourceIds = new Set(
    reservations
      .filter((reservation) => reservation.status === "CONFIRMED")
      .map((reservation) => reservation.resourceId),
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#resources">BookSlot</a>
        <div className="account">
          <span>{session.user.fullname}</span>
          <button className="text-button" type="button" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">RESERVAS</p>
        <h1>Encuentra el momento que te viene bien.</h1>
        <p>La disponibilidad se actualiza automáticamente cada 10 segundos.</p>
      </section>

      {message && <p className="notice notice-success">{message}</p>}
      {error && <p className="notice notice-error">{error}</p>}

      <section id="resources" className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">DISPONIBILIDAD</p>
            <h2>Sesiones abiertas</h2>
          </div>
          <span>{resources.length} recursos</span>
        </div>

        <div className="resource-grid">
          {resources.map((resource) => {
            const alreadyReserved = reservedResourceIds.has(resource.resourceId);
            const soldOut = resource.availableSpots <= 0;

            return (
              <article className="resource-card" key={resource.resourceId}>
                <div className="resource-card-header">
                  <div>
                    <h3>{resource.name}</h3>
                    {resource.description && <p>{resource.description}</p>}
                  </div>
                  <span className={soldOut ? "capacity capacity-full" : "capacity"}>
                    {soldOut ? "Completo" : `${resource.availableSpots} libres`}
                  </span>
                </div>

                <div className="capacity-line">
                  <span>Capacidad total</span>
                  <strong>{resource.spots} plazas</strong>
                </div>

                <div className="capacity-line">
                  <span>Fecha y hora</span>
                  <strong>{formatDate(resource.reservationDate)}</strong>
                </div>

                <button
                  className="button button-primary"
                  type="button"
                  disabled={soldOut || alreadyReserved || busyResourceId === resource.resourceId}
                  onClick={() => void reserve(resource.resourceId)}
                >
                  {busyResourceId === resource.resourceId
                    ? "Confirmando..."
                    : alreadyReserved
                      ? "Ya reservada"
                      : soldOut
                        ? "Sin plazas"
                        : "Reservar una plaza"}
                </button>
              </article>
            );
          })}
        </div>
        {resources.length === 0 && <p className="empty-state">No hay sesiones disponibles todavía.</p>}
      </section>

      <section className="content-section reservations-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MI AGENDA</p>
            <h2>Mis reservas</h2>
          </div>
          <span>{reservations.filter((reservation) => reservation.status === "CONFIRMED").length} activas</span>
        </div>

        <div className="reservation-list">
          {reservations.map((reservation) => (
            <article className="reservation-row" key={reservation.reservationId}>
              <div>
                <h3>{reservation.resourceName}</h3>
                <p>{formatDate(reservation.reservationDate)} · {reservation.spots} plaza</p>
              </div>
              {reservation.status === "CONFIRMED" ? (
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={busyReservationId === reservation.reservationId}
                  onClick={() => void cancel(reservation.reservationId)}
                >
                  {busyReservationId === reservation.reservationId ? "Cancelando..." : "Cancelar"}
                </button>
              ) : (
                <span className="cancelled">Cancelada</span>
              )}
            </article>
          ))}
          {reservations.length === 0 && <p className="empty-state">Aún no tienes reservas.</p>}
        </div>
      </section>

      <aside className="notification-counter" aria-live="polite">
        <span className="notification-counter-total">{reminders.length}</span>
        <div>
          <strong>Notificaciones recibidas</strong>
          <p>
            {reminders.length === 1
              ? "1 recordatorio enviado a tu correo"
              : `${reminders.length} recordatorios enviados a tu correo`}
          </p>
        </div>
      </aside>
    </main>
  );
}
