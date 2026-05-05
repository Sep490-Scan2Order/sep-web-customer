import { useEffect, useRef, useCallback } from "react";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { getSignalRHubUrl } from "@/services/signalr";

/**
 * Payload shape sent by the backend `MenuChanged` event.
 */
interface MenuChangedPayload {
  RestaurantId?: string;
  restaurantId?: string;
}

/**
 * Hook that connects to the SignalR hub and joins the restaurant group
 * to receive real-time `MenuChanged` events.
 *
 * When the backend broadcasts a `MenuChanged` event for the current
 * restaurant, `onMenuChanged` is called so the component can refetch its
 * menu data without a full page reload.
 *
 * Cleanup (connection.stop + handler removal) is performed automatically
 * when `restaurantId` changes or the component unmounts.
 *
 * @param restaurantId  The restaurant ID to listen on. Pass `null` to disable.
 * @param onMenuChanged Called whenever the backend notifies that the menu
 *                      has changed for this restaurant.
 */
export function useMenuSignalR(
  restaurantId: number | null,
  onMenuChanged: () => void,
) {
  const connectionRef = useRef<HubConnection | null>(null);

  // Keep a stable ref so the effect doesn't re-run on every render
  const onMenuChangedRef = useRef(onMenuChanged);
  onMenuChangedRef.current = onMenuChanged;

  const handler = useCallback((raw: unknown) => {
    const payload: MenuChangedPayload =
      typeof raw === "string"
        ? (() => {
            try {
              return JSON.parse(raw) as MenuChangedPayload;
            } catch {
              return {};
            }
          })()
        : (raw as MenuChangedPayload) ?? {};

    const receivedId =
      payload.RestaurantId ?? payload.restaurantId ?? "";

    // Only refetch when the event is for the currently displayed restaurant
    if (restaurantId !== null && receivedId === restaurantId.toString()) {
      console.log(
        `[SignalR] MenuChanged received for restaurantId=${receivedId} — refetching menu…`,
      );
      onMenuChangedRef.current();
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;

    const hubUrl = getSignalRHubUrl();
    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10_000])
      .configureLogging(
        process.env.NODE_ENV === "development"
          ? LogLevel.Information
          : LogLevel.Warning,
      )
      .build();

    connectionRef.current = connection;

    connection.on("MenuChanged", handler);

    connection.onreconnected(async () => {
      console.log("[SignalR] Reconnected — re-joining restaurant group", restaurantId);
      try {
        await connection.invoke("JoinRestaurantGroup", restaurantId.toString());
      } catch (err) {
        console.warn("[SignalR] Re-join restaurant group failed:", err);
      }
    });

    connection.onreconnecting(() => {
      console.log("[SignalR] Reconnecting…");
    });

    connection.onclose(() => {
      console.log("[SignalR] Disconnected");
    });

    (async () => {
      try {
        await connection.start();
        console.log("[SignalR] Connected (menu hub)");
        await connection.invoke("JoinRestaurantGroup", restaurantId.toString());
        console.log(`[SignalR] Joined restaurant group: ${restaurantId}`);
      } catch (err) {
        console.error("[SignalR] Connection failed (menu hub):", err);
      }
    })();

    return () => {
      connection.off("MenuChanged", handler);
      connection.stop().catch(() => undefined);
      connectionRef.current = null;
    };
  }, [restaurantId, handler]);
}
