// Both screens re-read the authoritative API; no separate section list is stored.
const channelName = "novaschola-sections";
export function notifySectionsChanged() {
  window.dispatchEvent(new Event(channelName));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage("changed");
    channel.close();
  }
}
export function subscribeSectionChanges(refresh: () => void) {
  const visibleRefresh = () => { if (document.visibilityState === "visible") refresh(); };
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(channelName) : null;
  if (channel) channel.onmessage = visibleRefresh;
  window.addEventListener(channelName, visibleRefresh);
  window.addEventListener("focus", visibleRefresh);
  document.addEventListener("visibilitychange", visibleRefresh);
  // Covers updates from other devices and API clients as well as browser tabs.
  const timer = window.setInterval(visibleRefresh, 5000);
  return () => {
    window.clearInterval(timer);
    channel?.close();
    window.removeEventListener(channelName, visibleRefresh);
    window.removeEventListener("focus", visibleRefresh);
    document.removeEventListener("visibilitychange", visibleRefresh);
  };
}
