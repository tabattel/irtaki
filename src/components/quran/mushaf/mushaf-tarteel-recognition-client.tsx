"use client";

import { useEffect, useRef } from "react";

type TarteelMode = "tarteel1" | "tarteel2";
type LifecycleAction = "start" | "pause" | "resume" | "stop";

type LifecycleDetail = {
  sessionId: string;
  mode: TarteelMode;
  action: LifecycleAction;
};

type PcmDetail = {
  sessionId: string;
  mode: TarteelMode;
  sequence: number;
  sampleRate: number;
  samples: Float32Array;
};

type ServerMessage = {
  type?: string;
  mode?: string;
  text?: string;
  sequence?: number;
  final?: boolean;
  audio_seconds?: number;
  window_start_seconds?: number;
  inference_seconds?: number;
  message?: string;
  error?: string;
};

type ClientStatus = {
  sessionId: string;
  mode: TarteelMode;
  status: "connecting" | "ready" | "stopped" | "error";
  message?: string;
};

type RecognitionResult = {
  sessionId: string;
  mode: TarteelMode;
  sequence: number;
  text: string;
  final: boolean;
  audioSeconds: number | null;
  windowStartSeconds: number | null;
  inferenceSeconds: number | null;
};

type Session = {
  sessionId: string;
  mode: TarteelMode;
  socket: WebSocket;
  ready: boolean;
  stopRequested: boolean;
  closed: boolean;
  pendingPackets: ArrayBuffer[];
};

const MAX_PENDING_PACKETS = 100;

function dispatchClientStatus(detail: ClientStatus) {
  window.dispatchEvent(
    new CustomEvent<ClientStatus>("irtaki:tarteel-websocket-status", {
      detail,
    }),
  );
}

function dispatchResult(detail: RecognitionResult) {
  window.dispatchEvent(
    new CustomEvent<RecognitionResult>("irtaki:tarteel-result", {
      detail,
    }),
  );
}

function websocketUrl(mode: TarteelMode): string {
  // HTTPS (via Cloudflare) : meme origine, le tunnel route /ws/ vers le port 8767.
  if (window.location.protocol === "https:") {
    return `wss://${window.location.host}/ws/${mode}`;
  }

  // HTTP (local / reseau) : connexion directe au port 8767.
  return `ws://${window.location.hostname}:8767/ws/${mode}`;
}

async function fetchTicket(mode: TarteelMode): Promise<string> {
  const response = await fetch("/api/tarteel/ticket", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });

  if (!response.ok) {
    throw new Error(`TARTEEL_TICKET_HTTP_${response.status}`);
  }

  const data = (await response.json()) as { ticket?: unknown };

  if (typeof data.ticket !== "string" || data.ticket.length === 0) {
    throw new Error("TARTEEL_TICKET_INVALID_RESPONSE");
  }

  return data.ticket;
}

function copySamplesToArrayBuffer(samples: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(samples.byteLength);
  new Float32Array(buffer).set(samples);
  return buffer;
}

export function MushafTarteelRecognitionClient() {
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    // Anti-StrictMode : un seul jeu de listeners, même si React monte 2 fois
    const WIN = window as unknown as { __irtakiTarteelClientMounted?: boolean };
    if (WIN.__irtakiTarteelClientMounted) {
      return () => {};
    }
    WIN.__irtakiTarteelClientMounted = true;

    let session: Session | null = null;

    function closeSession(current: Session) {
      if (current.closed) return;

      current.closed = true;
      current.pendingPackets = [];

      if (
        current.socket.readyState === WebSocket.OPEN ||
        current.socket.readyState === WebSocket.CONNECTING
      ) {
        current.socket.close();
      }

      if (session === current) {
        session = null;
      }
      if (sessionRef.current === current) {
        sessionRef.current = null;
      }
    }

    function sendPendingPackets(current: Session) {
      if (
        !current.ready ||
        current.closed ||
        current.socket.readyState !== WebSocket.OPEN
      ) {
        return;
      }

      while (current.pendingPackets.length > 0) {
        const packet = current.pendingPackets.shift();
        if (packet) current.socket.send(packet);
      }
    }

    function handleServerMessage(
      current: Session,
      message: ServerMessage,
    ) {
      if (current.closed || session !== current) return;

      if (message.type === "ready") {
        current.ready = true;

        current.socket.send(
          JSON.stringify({ type: "speech_start" }),
        );

        dispatchClientStatus({
          sessionId: current.sessionId,
          mode: current.mode,
          status: "ready",
        });

        sendPendingPackets(current);

        if (current.stopRequested) {
          current.socket.send(JSON.stringify({ type: "stop" }));
        }

        return;
      }

      if (message.type === "result") {
        dispatchResult({
          sessionId: current.sessionId,
          mode: current.mode,
          sequence: message.sequence ?? 0,
          text: message.text ?? "",
          final: message.final === true,
          audioSeconds: message.audio_seconds ?? null,
          windowStartSeconds: message.window_start_seconds ?? null,
          inferenceSeconds: message.inference_seconds ?? null,
        });

        return;
      }

      if (message.type === "stopped") {
        dispatchClientStatus({
          sessionId: current.sessionId,
          mode: current.mode,
          status: "stopped",
        });

        closeSession(current);
        return;
      }

      if (message.type === "error") {
        dispatchClientStatus({
          sessionId: current.sessionId,
          mode: current.mode,
          status: "error",
          message: message.message ?? message.error ?? "TARTEEL_SERVER_ERROR",
        });

        closeSession(current);
      }
    }

    function startSession(detail: LifecycleDetail) {
      // Anti-doublon : même sessionId déjà en cours (autre closure StrictMode)
      const active = sessionRef.current;
      if (active && active.sessionId === detail.sessionId) return;
      if (active && !active.closed) closeSession(active);

      if (session) {
        if (session.sessionId === detail.sessionId) return;
        closeSession(session);
      }

      dispatchClientStatus({
        sessionId: detail.sessionId,
        mode: detail.mode,
        status: "connecting",
      });

      // Ticket a usage unique, demande en parallele de l ouverture du socket.
      const ticketPromise = fetchTicket(detail.mode);
      ticketPromise.catch(() => undefined);

      let socket: WebSocket;

      try {
        socket = new WebSocket(websocketUrl(detail.mode));
        socket.binaryType = "arraybuffer";
      } catch (error) {
        dispatchClientStatus({
          sessionId: detail.sessionId,
          mode: detail.mode,
          status: "error",
          message:
            error instanceof Error ? error.message : "TARTEEL_SOCKET_ERROR",
        });
        return;
      }

      const current: Session = {
        sessionId: detail.sessionId,
        mode: detail.mode,
        socket,
        ready: false,
        stopRequested: false,
        closed: false,
        pendingPackets: [],
      };

      session = current;
      sessionRef.current = current;

      socket.onopen = () => {
        if (current.closed || session !== current) return;

        ticketPromise
          .then((ticket) => {
            if (current.closed || session !== current) return;

            socket.send(
              JSON.stringify({
                type: "configure",
                sample_rate: 16000,
                ticket,
              }),
            );
          })
          .catch((error: unknown) => {
            if (current.closed) return;

            dispatchClientStatus({
              sessionId: current.sessionId,
              mode: current.mode,
              status: "error",
              message:
                error instanceof Error ? error.message : "TARTEEL_TICKET_ERROR",
            });

            closeSession(current);
          });
      };

      socket.onmessage = (event: MessageEvent) => {
        if (typeof event.data !== "string") return;

        try {
          const message = JSON.parse(event.data) as ServerMessage;
          handleServerMessage(current, message);
        } catch {
          dispatchClientStatus({
            sessionId: current.sessionId,
            mode: current.mode,
            status: "error",
            message: "TARTEEL_INVALID_SERVER_MESSAGE",
          });

          closeSession(current);
        }
      };

      socket.onerror = () => {
        if (current.closed) return;

        dispatchClientStatus({
          sessionId: current.sessionId,
          mode: current.mode,
          status: "error",
          message: "TARTEEL_WEBSOCKET_CONNECTION_ERROR",
        });
      };

      socket.onclose = () => {
        if (current.closed) return;

        current.closed = true;
        current.pendingPackets = [];

        dispatchClientStatus({
          sessionId: current.sessionId,
          mode: current.mode,
          status: "error",
          message: "TARTEEL_WEBSOCKET_CLOSED_UNEXPECTEDLY",
        });

        if (session === current) {
          session = null;
        }
      };
    }

    function handlePcm(event: Event) {
      const detail = (event as CustomEvent<PcmDetail>).detail;
      const current = session;

      if (
        !detail ||
        !current ||
        current.closed ||
        detail.sessionId !== current.sessionId ||
        detail.mode !== current.mode ||
        detail.sampleRate !== 16000
      ) {
        return;
      }

      if (current.socket.readyState === WebSocket.OPEN && current.ready) {
        current.socket.send(
          copySamplesToArrayBuffer(detail.samples),
        );
        return;
      }

      if (current.pendingPackets.length >= MAX_PENDING_PACKETS) {
        current.pendingPackets.shift();
      }

      current.pendingPackets.push(
        copySamplesToArrayBuffer(detail.samples),
      );
    }

    function handleLifecycle(event: Event) {
      const detail = (event as CustomEvent<LifecycleDetail>).detail;
      if (!detail) return;

      if (detail.action === "start") {
        startSession(detail);
        return;
      }

      const current = session;

      if (!current || current.sessionId !== detail.sessionId) return;

      if (detail.action === "stop") {
        current.stopRequested = true;

        if (
          current.ready &&
          current.socket.readyState === WebSocket.OPEN
        ) {
          current.socket.send(JSON.stringify({ type: "stop" }));
        } else if (current.socket.readyState === WebSocket.CONNECTING) {
          // Le message stop sera envoyé après la réponse ready.
        }

        return;
      }

      if (detail.action === "pause" || detail.action === "resume") {
        if (
          current.stopRequested ||
          current.closed ||
          !current.ready ||
          current.socket.readyState !== WebSocket.OPEN
        ) {
          return;
        }

        current.socket.send(
          JSON.stringify({ type: detail.action }),
        );

        return;
      }
    }

    window.addEventListener(
      "irtaki:tarteel-recognition",
      handleLifecycle,
    );

    window.addEventListener("irtaki:tarteel-pcm", handlePcm);

    return () => {
      WIN.__irtakiTarteelClientMounted = false;

      window.removeEventListener(
        "irtaki:tarteel-recognition",
        handleLifecycle,
      );

      window.removeEventListener("irtaki:tarteel-pcm", handlePcm);

      if (session) {
        closeSession(session);
      }
    };
  }, []);

  return null;
}
