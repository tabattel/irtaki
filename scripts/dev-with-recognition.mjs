import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { access, readFile, stat } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SERVICE_SCRIPT = join(
  ROOT,
  "ai/quran-recognition/run-service.sh",
);

const UVICORN = join(
  ROOT,
  "ai/quran-recognition/.venv/bin/uvicorn",
);

const NEXT_CLI = join(
  ROOT,
  "node_modules/next/dist/bin/next",
);

const EXPECTED_MODEL = "openai/whisper-large-v3-turbo";

const DEFAULT_STARTUP_TIMEOUT = 180_000;
const startupTimeout = Number(
  process.env.TILAWA_RECOGNITION_STARTUP_TIMEOUT_MS ??
    DEFAULT_STARTUP_TIMEOUT,
);

let serviceChild = null;
let nextChild = null;
let serviceOwned = false;
let serviceReady = false;
let serviceFailure = false;
let shuttingDown = false;
let receivedSignal = null;
let serviceSpawnError = null;

function expandPath(value) {
  if (value === "~") return homedir();

  if (value.startsWith("~/")) {
    return join(homedir(), value.slice(2));
  }

  return resolve(ROOT, value);
}

function getRecognitionConfig() {
  const configuredUrl = process.env.TILAWA_RECOGNITION_URL?.trim();
  const parsedUrl = configuredUrl ? new URL(configuredUrl) : null;

  if (parsedUrl) {
    if (
      parsedUrl.protocol !== "http:" ||
      !["127.0.0.1", "localhost"].includes(parsedUrl.hostname)
    ) {
      throw new Error(
        "TILAWA_RECOGNITION_URL doit utiliser http://127.0.0.1 ou localhost.",
      );
    }
  }

  const urlPort = parsedUrl
    ? Number(parsedUrl.port || 80)
    : undefined;

  const port = Number(
    process.env.TILAWA_RECOGNITION_PORT ??
      urlPort ??
      8765,
  );

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Port de reconnaissance invalide.");
  }

  if (parsedUrl && urlPort !== port) {
    throw new Error(
      "TILAWA_RECOGNITION_PORT ne correspond pas au port de TILAWA_RECOGNITION_URL.",
    );
  }

  const baseUrl = parsedUrl
    ? parsedUrl.origin
    : `http://127.0.0.1:${port}`;

  return {
    port,
    baseUrl,
    healthUrl: new URL("/health", baseUrl),
  };
}

function signalChildGroup(child, signal) {
  if (!child?.pid) return;

  try {
    if (process.platform === "win32") {
      child.kill(signal);
    } else {
      process.kill(-child.pid, signal);
    }
  } catch (error) {
    if (error?.code !== "ESRCH") {
      console.error("Erreur d'arrêt d'un processus :", error.message);
    }
  }
}

function handleSignal(signal) {
  if (receivedSignal) return;

  receivedSignal = signal;

  console.log(
    `\n[IRTAKI DEV] Signal ${signal} reçu. Arrêt propre en cours...`,
  );

  if (nextChild) {
    signalChildGroup(nextChild, signal);
  } else if (serviceOwned && serviceChild) {
    signalChildGroup(serviceChild, signal);
  }
}

process.on("SIGINT", () => handleSignal("SIGINT"));
process.on("SIGTERM", () => handleSignal("SIGTERM"));

function hasExited(child) {
  return (
    !child ||
    child.exitCode !== null ||
    child.signalCode !== null
  );
}

function waitForExit(child, timeoutMs) {
  if (hasExited(child)) return Promise.resolve(true);

  return new Promise((resolvePromise) => {
    let finished = false;

    const finish = (exited) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      child.off("exit", onExit);
      resolvePromise(exited);
    };

    const onExit = () => finish(true);

    const timer = setTimeout(
      () => finish(hasExited(child)),
      timeoutMs,
    );

    child.once("exit", onExit);

    if (hasExited(child)) finish(true);
  });
}

async function stopChild(child, label) {
  if (!child?.pid || hasExited(child)) return;

  console.log(`[IRTAKI DEV] Arrêt de ${label}...`);

  signalChildGroup(child, "SIGTERM");

  const exited = await waitForExit(child, 7000);

  if (!exited && !hasExited(child)) {
    console.warn(
      `[IRTAKI DEV] ${label} ne répond pas à SIGTERM : SIGKILL.`,
    );

    signalChildGroup(child, "SIGKILL");
    await waitForExit(child, 3000);
  }
}

async function checkLocalSetup() {
  if (!Number.isFinite(startupTimeout) || startupTimeout < 1000) {
    throw new Error("Délai de démarrage du moteur invalide.");
  }

  await access(SERVICE_SCRIPT, fsConstants.X_OK);
  await access(UVICORN, fsConstants.X_OK);
  await access(NEXT_CLI, fsConstants.R_OK);

  const modelPath = expandPath(
    process.env.TILAWA_RECOGNITION_MODEL_PATH ??
      join(ROOT, "ai/quran-recognition/models/openai-whisper-large-v3-turbo"),
  );

  const modelInfo = await stat(modelPath).catch(() => null);

  if (!modelInfo?.isDirectory()) {
    throw new Error("Le dossier du modèle Whisper Large-v3 Turbo est absent.");
  }

  const tokenPath = expandPath(
    process.env.TILAWA_RECOGNITION_TOKEN_FILE ??
      join(homedir(), ".config/irtaki/tilawa-recognition.token"),
  );

  const token = await readFile(tokenPath, "utf8").catch(() => "");

  if (!/^[0-9a-f]{64}$/.test(token.trim())) {
    throw new Error(
      "Le fichier du token de reconnaissance est absent ou invalide. Sa valeur n'est jamais affichée.",
    );
  }

  console.log("[IRTAKI DEV] Environnement Python, modèle et token vérifiés.");
}

function isPortOpen(port) {
  return new Promise((resolvePromise) => {
    const socket = createConnection({
      host: "127.0.0.1",
      port,
    });

    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolvePromise(result);
    };

    const timer = setTimeout(() => finish(false), 800);

    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

async function waitForRecognition(healthUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastNotice = 0;

  console.log(
    "[IRTAKI DEV] Attente du chargement réel de Whisper Large-v3 Turbo...",
  );

  while (Date.now() < deadline) {
    if (receivedSignal) {
      throw new Error("Démarrage interrompu par l'utilisateur.");
    }

    if (serviceSpawnError) {
      throw new Error(
        `Impossible de démarrer le moteur : ${serviceSpawnError.message}`,
      );
    }

    if (serviceOwned && hasExited(serviceChild)) {
      throw new Error(
        `Le moteur s'est arrêté pendant son démarrage (code ${serviceChild?.exitCode}, signal ${serviceChild?.signalCode}).`,
      );
    }

    let response;

    try {
      response = await fetch(healthUrl, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(1800),
      });
    } catch {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
      continue;
    }

    if (!response.ok) {
      throw new Error(
        `Le port ${healthUrl.port} répond HTTP ${response.status} sur /health. Vérifie le service déjà présent.`,
      );
    }

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error("La réponse /health du moteur n'est pas un JSON valide.");
    }

    if (data.model !== EXPECTED_MODEL) {
      throw new Error(
        `Mauvais modèle détecté : ${String(data.model)}. Modèle attendu : ${EXPECTED_MODEL}.`,
      );
    }

    if (data.status === "ready" && data.loaded === true) {
      serviceReady = true;

      console.log(
        `[IRTAKI DEV] Moteur prêt : ${data.model} (${data.device ?? "device inconnu"}).`,
      );

      return;
    }

    if (data.status !== "starting" && data.loaded !== false) {
      throw new Error("État de santé inattendu du moteur de reconnaissance.");
    }

    if (Date.now() - lastNotice > 15_000) {
      console.log("[IRTAKI DEV] Modèle en cours de chargement...");
      lastNotice = Date.now();
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  }

  throw new Error(
    `Le moteur n'est pas devenu opérationnel après ${Math.round(timeoutMs / 1000)} secondes.`,
  );
}

async function main() {
  let resultCode = 0;

  try {
    const config = getRecognitionConfig();

    await checkLocalSetup();

    const portAlreadyOpen = await isPortOpen(config.port);

    const childEnv = {
      ...process.env,
      TILAWA_RECOGNITION_PORT: String(config.port),
      TILAWA_RECOGNITION_URL:
        process.env.TILAWA_RECOGNITION_URL ?? config.baseUrl,
    };

    if (portAlreadyOpen) {
      console.log(
        `[IRTAKI DEV] Port ${config.port} déjà occupé. Aucun second moteur ne sera lancé.`,
      );
    } else {
      console.log("[IRTAKI DEV] Démarrage du moteur Python...");

      serviceChild = spawn("bash", [SERVICE_SCRIPT], {
        cwd: ROOT,
        env: childEnv,
        stdio: "inherit",
        detached: process.platform !== "win32",
      });

      serviceOwned = true;

      serviceChild.once("error", (error) => {
        serviceSpawnError = error;
      });

      serviceChild.once("exit", (code, signal) => {
        if (
          serviceReady &&
          !shuttingDown &&
          !receivedSignal
        ) {
          serviceFailure = true;

          console.error(
            `[IRTAKI DEV] Le moteur s'est arrêté (code ${code}, signal ${signal}).`,
          );

          if (nextChild) {
            signalChildGroup(nextChild, "SIGTERM");
          }
        }
      });
    }

    await waitForRecognition(
      config.healthUrl,
      startupTimeout,
    );

    if (receivedSignal || serviceFailure) {
      throw new Error("Le démarrage de Next.js a été interrompu.");
    }

    if (serviceOwned && hasExited(serviceChild)) {
      throw new Error("Le moteur s'est arrêté avant le démarrage de Next.js.");
    }

    console.log("[IRTAKI DEV] Démarrage de Next.js...");

    nextChild = spawn(
      process.execPath,
      [NEXT_CLI, "dev"],
      {
        cwd: ROOT,
        env: childEnv,
        stdio: "inherit",
        detached: process.platform !== "win32",
      },
    );

    const nextResult = await new Promise((resolvePromise, rejectPromise) => {
      nextChild.once("error", rejectPromise);

      nextChild.once("exit", (code, signal) => {
        resolvePromise({ code, signal });
      });
    });

    if (receivedSignal === "SIGINT") {
      resultCode = 130;
    } else if (receivedSignal === "SIGTERM") {
      resultCode = 143;
    } else if (
      serviceFailure ||
      nextResult.signal !== null
    ) {
      resultCode = 1;
    } else {
      resultCode = nextResult.code ?? 1;
    }
  } catch (error) {
    if (receivedSignal === "SIGINT") {
      resultCode = 130;
    } else if (receivedSignal === "SIGTERM") {
      resultCode = 143;
    } else {
      console.error(
        `\n[IRTAKI DEV] ERREUR : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      resultCode = 1;
    }
  } finally {
    shuttingDown = true;

    if (nextChild) {
      await stopChild(nextChild, "Next.js");
    }

    if (serviceOwned && serviceChild) {
      await stopChild(serviceChild, "moteur de reconnaissance");
    }

    if (serviceOwned) {
      console.log("[IRTAKI DEV] Moteur lancé par ce superviseur arrêté.");
    } else if (serviceReady) {
      console.log("[IRTAKI DEV] Moteur préexistant conservé.");
    }
  }

  process.exitCode = resultCode;
}

await main();
