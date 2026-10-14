// ============================================================
// Notifications push de l'app « Emerald Beauty Pro » (serveur uniquement).
//
// - Clés d'envoi (VAPID) créées automatiquement au premier usage et gardées
//   dans la table verrouillée push_cles (aucun accès hors serveur).
// - Chaque message est chiffré pour le téléphone de Maria (norme Web Push,
//   RFC 8291 / 8292) avec WebCrypto : seul son téléphone peut le lire.
// - Les messages ne contiennent jamais de donnée sensible : pas de nom, de
//   téléphone ni d'e-mail de cliente, seulement la date et l'heure.
// ============================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { SITE_URL } from "@/config/business";

type Admin = SupabaseClient<Database>;

export type MessagePush = {
  titre: string;
  corps: string;
  /** Regroupe les notifications du même type (une seule visible à la fois). */
  tag?: string;
  /** Page ouverte au toucher de la notification. */
  url?: string;
};

// ---------- Encodage ----------
const enc = new TextEncoder();
type Octets = Uint8Array<ArrayBuffer>;

export function versB64url(octets: ArrayBuffer | Uint8Array) {
  const o = octets instanceof Uint8Array ? octets : new Uint8Array(octets);
  let s = "";
  for (const b of o) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function depuisB64url(texte: string): Octets {
  const b64 = texte.replace(/-/g, "+").replace(/_/g, "/");
  const s = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

const concat = (...parts: Uint8Array[]): Octets => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
};

// ---------- HKDF (HMAC-SHA-256) ----------
async function hmac(cle: Octets, donnees: Octets) {
  const k = await crypto.subtle.importKey("raw", cle, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, donnees));
}
/** HKDF en une étape (longueur ≤ 32 octets). */
async function hkdf(sel: Octets, ikm: Octets, info: Octets, longueur: number) {
  const prk = await hmac(sel, ikm);
  return (await hmac(prk, concat(info, new Uint8Array([1])))).slice(0, longueur);
}

/**
 * Chiffre un message pour un abonnement (RFC 8291, « aes128gcm »).
 * `p256dh` et `auth` viennent du téléphone (base64url).
 */
export async function chiffrerMessage(message: Uint8Array, p256dh: string, auth: string) {
  const cleTel = depuisB64url(p256dh);
  const secretTel = depuisB64url(auth);
  if (cleTel.length !== 65 || secretTel.length !== 16) throw new Error("Abonnement invalide");

  const ephemere = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ])) as CryptoKeyPair;
  const clePubEph = new Uint8Array(await crypto.subtle.exportKey("raw", ephemere.publicKey));
  const cleTelImportee = await crypto.subtle.importKey(
    "raw",
    cleTel,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const secretPartage = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: cleTelImportee } as EcdhKeyDeriveParams,
      ephemere.privateKey,
      256,
    ),
  );

  const ikm = await hkdf(
    secretTel,
    secretPartage,
    concat(enc.encode("WebPush: info\0"), cleTel, clePubEph),
    32,
  );
  const sel = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(sel, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(sel, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const cleAes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // Délimiteur 0x02 : dernier (et unique) bloc, sans bourrage.
  const chiffre = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      cleAes,
      concat(message, new Uint8Array([2])),
    ),
  );
  const tailleBloc = new Uint8Array([0, 0, 0x10, 0]); // 4096
  return concat(sel, tailleBloc, new Uint8Array([clePubEph.length]), clePubEph, chiffre);
}

// ---------- Clés d'envoi (VAPID) ----------
type ClesVapid = { publique: string; privee: JsonWebKey };

/** Clés d'envoi du site : lues en base, créées une seule fois au premier usage. */
export async function clesVapid(admin: Admin): Promise<ClesVapid> {
  const lire = async () => {
    const { data } = await admin
      .from("push_cles")
      .select("cle_publique, cle_privee_jwk")
      .eq("id", 1)
      .maybeSingle();
    return data
      ? { publique: data.cle_publique, privee: data.cle_privee_jwk as unknown as JsonWebKey }
      : null;
  };
  const existantes = await lire();
  if (existantes) return existantes;

  const paire = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const publique = versB64url(await crypto.subtle.exportKey("raw", paire.publicKey));
  const privee = await crypto.subtle.exportKey("jwk", paire.privateKey);
  // Deux créations simultanées : la première gagne, l'autre relit.
  await admin
    .from("push_cles")
    .upsert(
      { id: 1, cle_publique: publique, cle_privee_jwk: privee as never },
      { onConflict: "id", ignoreDuplicates: true },
    );
  const finales = await lire();
  if (!finales) throw new Error("Clés de notification indisponibles");
  return finales;
}

/** Jeton d'envoi signé (RFC 8292) pour le service de notification du téléphone. */
export async function jetonVapid(endpoint: string, cles: ClesVapid) {
  const entete = versB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const corps = versB64url(
    enc.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: SITE_URL,
      }),
    ),
  );
  const cle = await crypto.subtle.importKey(
    "jwk",
    cles.privee,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cle,
    enc.encode(`${entete}.${corps}`),
  );
  return `${entete}.${corps}.${versB64url(signature)}`;
}

// ---------- Abonnements ----------
/** Services de notification des navigateurs (Chrome/Android, Apple, Firefox, Edge). */
const HOTES_PUSH = [
  "fcm.googleapis.com",
  "push.apple.com",
  "push.services.mozilla.com",
  "notify.windows.com",
];

/** L'adresse d'abonnement pointe bien vers un service de notification connu. */
export function endpointValide(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return (
      u.protocol === "https:" &&
      HOTES_PUSH.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))
    );
  } catch {
    return false;
  }
}

/** Envoie une notification à tous les appareils de Maria. Ne lève jamais d'erreur. */
export async function notifierGerante(admin: Admin, message: MessagePush) {
  try {
    const { data: abonnements } = await admin
      .from("push_abonnements")
      .select("id, endpoint, p256dh, auth");
    if (!abonnements?.length) return 0;
    const cles = await clesVapid(admin);
    const contenu = enc.encode(
      JSON.stringify({
        titre: message.titre,
        corps: message.corps,
        tag: message.tag ?? "emerald",
        url: message.url ?? "/admin",
      }),
    );
    const resultats = await Promise.allSettled(
      abonnements.map(async (a) => {
        if (!endpointValide(a.endpoint)) return false;
        const res = await fetch(a.endpoint, {
          method: "POST",
          headers: {
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            TTL: String(24 * 3600),
            Urgency: "high",
            Authorization: `vapid t=${await jetonVapid(a.endpoint, cles)}, k=${cles.publique}`,
          },
          body: await chiffrerMessage(contenu, a.p256dh, a.auth),
        });
        // Abonnement expiré ou retiré du téléphone : on l'oublie.
        if (res.status === 404 || res.status === 410) {
          await admin.from("push_abonnements").delete().eq("id", a.id);
          return false;
        }
        if (!res.ok) console.error(`[push] envoi refusé (${res.status})`);
        return res.ok;
      }),
    );
    return resultats.filter((r) => r.status === "fulfilled" && r.value).length;
  } catch (e) {
    console.error("[push]", e);
    return 0;
  }
}
