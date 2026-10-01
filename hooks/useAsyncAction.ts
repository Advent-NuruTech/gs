"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AsyncStatus = "idle" | "loading" | "success" | "error";

interface UseAsyncActionOptions<Args extends unknown[], Result> {
  action: (...args: Args) => Promise<Result>;
  /** Text shown in the success StatusCard. Omit to skip the success message. */
  successMessage?: string | ((result: Result) => string);
  onSuccess?: (result: Result) => void | Promise<void>;
  onError?: (error: Error) => void;
}

interface UseAsyncActionResult<Args extends unknown[]> {
  /** Runs the action. Extra clicks while it is running are ignored, never queued. */
  run: (...args: Args) => Promise<void>;
  status: AsyncStatus;
  isLoading: boolean;
  successMessage: string;
  errorMessage: string;
  reset: () => void;
}

/**
 * Tracks a user-triggered async action (form submit, button click) so the UI can
 * always show a busy state, block double submits, and report the outcome.
 */
export function useAsyncAction<Args extends unknown[], Result>({
  action,
  successMessage,
  onSuccess,
  onError,
}: UseAsyncActionOptions<Args, Result>) {
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [success, setSuccess] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const actionRef = useRef(action);
  const successRef = useRef(successMessage);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    actionRef.current = action;
    successRef.current = successMessage;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (...args: Args) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus("loading");
    setSuccess("");
    setErrorMessage("");
    try {
      const result = await actionRef.current(...args);
      const message =
        typeof successRef.current === "function"
          ? (successRef.current as (value: Result) => string)(result)
          : successRef.current;
      if (mounted.current) {
        setStatus("success");
        setSuccess(message ?? "");
      }
      await onSuccessRef.current?.(result);
    } catch (caught) {
      const error = caught instanceof Error ? caught : new Error("Something went wrong. Try again.");
      if (mounted.current) {
        setStatus("error");
        setErrorMessage(error.message);
      }
      onErrorRef.current?.(error);
    } finally {
      inFlight.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setSuccess("");
    setErrorMessage("");
  }, []);

  return {
    run,
    status,
    isLoading: status === "loading",
    successMessage: success,
    errorMessage,
    reset,
  };
}
