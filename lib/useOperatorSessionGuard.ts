"use client";

import {
  pollOperatorLogin,
  redirectToOperatorLogin,
  reportOperatorTranslationActivity,
} from "@/lib/operatorLoginClient";
import {
  parseOperatorLoginReason,
  type OperatorLoginReason,
} from "@/lib/operatorLogin";
import { useEffect, useRef } from "react";

const LOGIN_POLL_MS = 15_000;
const TRANSLATION_HEARTBEAT_MS = 30_000;

export function useOperatorSessionGuard(options: {
  enabled: boolean;
  isTranslationActive: boolean;
  idleDeadlineAt?: string | null;
  onUnauthorized: (reason?: OperatorLoginReason) => void;
}) {
  const onUnauthorizedRef = useRef(options.onUnauthorized);
  const idleDeadlineAtRef = useRef(options.idleDeadlineAt ?? null);

  useEffect(() => {
    onUnauthorizedRef.current = options.onUnauthorized;
  }, [options.onUnauthorized]);

  useEffect(() => {
    idleDeadlineAtRef.current = options.idleDeadlineAt ?? null;
  }, [options.idleDeadlineAt]);

  useEffect(() => {
    if (!options.enabled) {
      return;
    }

    const expire = (reason?: OperatorLoginReason) => {
      onUnauthorizedRef.current(reason);
    };

    const poll = async () => {
      const result = await pollOperatorLogin();

      if (!result.ok) {
        if (result.status === 401) {
          expire(parseOperatorLoginReason(result.reason));
        }
        return;
      }

      if (result.idleDeadlineAt) {
        idleDeadlineAtRef.current = result.idleDeadlineAt;
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, LOGIN_POLL_MS);

    return () => window.clearInterval(timer);
  }, [options.enabled]);

  useEffect(() => {
    if (!options.enabled || !options.isTranslationActive) {
      return;
    }

    const heartbeat = async () => {
      const result = await reportOperatorTranslationActivity();

      if (!result.ok) {
        if (result.status === 401) {
          onUnauthorizedRef.current(parseOperatorLoginReason(result.reason));
        }
        return;
      }

      if (result.idleDeadlineAt) {
        idleDeadlineAtRef.current = result.idleDeadlineAt;
      }
    };

    void heartbeat();
    const timer = window.setInterval(() => {
      void heartbeat();
    }, TRANSLATION_HEARTBEAT_MS);

    return () => {
      window.clearInterval(timer);
      void reportOperatorTranslationActivity().then((result) => {
        if (result.ok && result.idleDeadlineAt) {
          idleDeadlineAtRef.current = result.idleDeadlineAt;
        }
      });
    };
  }, [options.enabled, options.isTranslationActive]);

  useEffect(() => {
    if (!options.enabled) {
      return;
    }

    const timer = window.setInterval(() => {
      const deadline = idleDeadlineAtRef.current;

      if (!deadline) {
        return;
      }

      const remainingMs = Date.parse(deadline) - Date.now();

      if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
        onUnauthorizedRef.current("idle");
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [options.enabled]);
}

let expireOperatorSessionStarted = false;

export function expireOperatorSession(reason?: OperatorLoginReason) {
  if (expireOperatorSessionStarted) {
    return;
  }

  expireOperatorSessionStarted = true;
  void redirectToOperatorLogin(reason);
}
