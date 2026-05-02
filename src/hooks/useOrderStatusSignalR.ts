import { useEffect, useRef, useState, useCallback } from "react";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { getSignalRHubUrl } from "@/services/signalr";

/**
 * Payload shape sent by the backend `CustomerUpdateStatus` event.
 * Backend may use PascalCase or camelCase depending on the serializer config.
 */
interface CustomerUpdateStatusPayload {
  OrderId?: string;
  orderId?: string;
  Status?: number;
  status?: number;
}

/**
 * Hook that connects to the SignalR hub and joins the `order:{orderId}` group
 * to receive real-time `CustomerUpdateStatus` events.
 *
 * When SignalR is disconnected it activates a fallback polling callback at a
 * slower interval (default 10 s) to keep the UI responsive.
 *
 * @param orderId  The order ID to listen on. Pass `null` to disable.
 * @param onStatusChanged  Called whenever a status update is received (SignalR
 *                         or fallback polling). Receives the new numeric status.
 * @param fallbackPollFn   Optional async function used as a fallback when
 *                         SignalR is disconnected. Should return the current
 *                         numeric status of the order, or `null` if unknown.
 * @param fallbackIntervalMs  Interval for fallback polling (default 10 000 ms).
 */
export function useOrderStatusSignalR(
  orderId: string | null,
  onStatusChanged: (status: number) => void,
  fallbackPollFn?: () => Promise<number | null>,
  fallbackIntervalMs = 10_000,
) {
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep stable refs for callbacks so the effect doesn't re-run on every render
  const onStatusChangedRef = useRef(onStatusChanged);
  onStatusChangedRef.current = onStatusChanged;
  const fallbackPollFnRef = useRef(fallbackPollFn);
  fallbackPollFnRef.current = fallbackPollFn;

  /* ────────── SignalR connection ────────── */
  useEffect(() => {
    if (!orderId) return;

    const hubUrl = getSignalRHubUrl();
    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(
        process.env.NODE_ENV === "development"
          ? LogLevel.Information
          : LogLevel.Warning,
      )
      .build();

    connectionRef.current = connection;

    // Parse payload defensively (PascalCase / camelCase, or raw JSON string)
    connection.on("CustomerUpdateStatus", (raw: unknown) => {
      const payload: unknown =
        typeof raw === "string"
          ? (() => {
              try {
                return JSON.parse(raw);
              } catch {
                return null;
              }
            })()
          : raw;

      const id =
        (payload as CustomerUpdateStatusPayload)?.orderId ??
        (payload as CustomerUpdateStatusPayload)?.OrderId;
      const status =
        (payload as CustomerUpdateStatusPayload)?.status ??
        (payload as CustomerUpdateStatusPayload)?.Status;

      if (id === orderId && typeof status === "number") {
        onStatusChangedRef.current(status);
      }
    });

    connection.onreconnected(async () => {
      console.log("[SignalR] Reconnected — re-joining group", orderId);
      setIsConnected(true);
      try {
        await connection.invoke("JoinOrderGroup", orderId);
      } catch (err) {
        console.warn("[SignalR] Re-join failed:", err);
      }
    });

    connection.onreconnecting(() => {
      console.log("[SignalR] Reconnecting…");
      setIsConnected(false);
    });

    connection.onclose(() => {
      console.log("[SignalR] Disconnected");
      setIsConnected(false);
    });

    (async () => {
      try {
        await connection.start();
        console.log("[SignalR] Connected");
        setIsConnected(true);
        await connection.invoke("JoinOrderGroup", orderId);
        console.log(`[SignalR] Joined order group: ${orderId}`);
      } catch (err) {
        console.error("[SignalR] Connection failed:", err);
        setIsConnected(false);
      }
    })();

    return () => {
      connection.stop().catch(() => undefined);
      connectionRef.current = null;
    };
  }, [orderId]);

  /* ────────── Fallback polling (only when disconnected) ────────── */
  useEffect(() => {
    if (!orderId) return;

    if (!isConnected && fallbackPollFnRef.current) {
      // SignalR disconnected → activate slower fallback polling
      const poll = async () => {
        try {
          const status = await fallbackPollFnRef.current?.();
          if (typeof status === "number") {
            onStatusChangedRef.current(status);
          }
        } catch {
          // ignore polling errors
        }
      };

      // Run once immediately
      poll();
      pollingRef.current = setInterval(poll, fallbackIntervalMs);
    } else {
      // SignalR connected → stop any active fallback polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isConnected, orderId, fallbackIntervalMs]);

  return { isConnected };
}
