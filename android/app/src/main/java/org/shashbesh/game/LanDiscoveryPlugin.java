package org.shashbesh.game;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.InetAddress;
import java.net.Inet4Address;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

/** Android DNS-SD client for the same Wi-Fi network. Socket/game authority remains on the LAN host. */
@CapacitorPlugin(name="LanDiscovery")
public class LanDiscoveryPlugin extends Plugin {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final LinkedHashMap<String, JSObject> found = new LinkedHashMap<>();
    private final ArrayDeque<NsdServiceInfo> queue = new ArrayDeque<>();
    private NsdManager manager;
    private NsdManager.DiscoveryListener listener;
    private WifiManager.MulticastLock lock;
    private PluginCall pending;
    private boolean resolving = false;

    @PluginMethod
    public void discover(PluginCall call) {
        handler.post(() -> {
            if (pending != null) { call.reject("Discovery is already running"); return; }
            pending = call; found.clear(); queue.clear(); resolving = false;
            manager = (NsdManager) getContext().getSystemService(Context.NSD_SERVICE);
            if (manager == null) { pending = null; call.reject("NSD unavailable; connect by IP"); return; }
            WifiManager wifi = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wifi != null) {
                lock = wifi.createMulticastLock("shashbesh-discovery"); lock.setReferenceCounted(false);
                try { lock.acquire(); } catch (SecurityException ignored) { lock = null; }
            }
            listener = new NsdManager.DiscoveryListener() {
                public void onDiscoveryStarted(String type) {}
                public void onDiscoveryStopped(String type) {}
                public void onStartDiscoveryFailed(String type, int code) { handler.post(() -> { if (pending == call) finish(); }); }
                public void onStopDiscoveryFailed(String type, int code) {}
                public void onServiceLost(NsdServiceInfo service) { handler.post(() -> { if (pending == call) found.remove(service.getServiceName()); }); }
                public void onServiceFound(NsdServiceInfo service) {
                    if ("_shashbesh._tcp.".equals(service.getServiceType())) handler.post(() -> { if (pending == call) { queue.add(service); resolveNext(); } });
                }
            };
            try { manager.discoverServices("_shashbesh._tcp.", NsdManager.PROTOCOL_DNS_SD, listener); }
            catch (RuntimeException e) { finish(); return; }
            handler.postDelayed(() -> { if (pending == call) finish(); }, 6000);
        });
    }
    @SuppressWarnings("deprecation")
    private void resolveNext() {
        if (pending == null || resolving || queue.isEmpty()) return;
        final PluginCall attempt = pending;
        resolving = true;
        try { manager.resolveService(queue.remove(), new NsdManager.ResolveListener() {
            public void onResolveFailed(NsdServiceInfo service, int code) { handler.post(() -> { if (pending != attempt) return; resolving = false; resolveNext(); }); }
            public void onServiceResolved(NsdServiceInfo service) { handler.post(() -> {
                if (pending != attempt) return;
                List<InetAddress> addresses = new ArrayList<>();
                if (Build.VERSION.SDK_INT >= 34) addresses.addAll(service.getHostAddresses());
                else if (service.getHost() != null) addresses.add(service.getHost());
                for (InetAddress host : addresses) if (host instanceof Inet4Address) {
                    JSObject entry = new JSObject(); entry.put("name", service.getServiceName()); entry.put("host", host.getHostAddress()); entry.put("port", service.getPort());
                    entry.put("url", "http://" + host.getHostAddress() + ":" + service.getPort()); found.put(service.getServiceName(), entry); break;
                }
                resolving = false; resolveNext();
            }); }
        }); } catch (RuntimeException e) { resolving = false; resolveNext(); }
    }
    private void finish() {
        if (pending == null) return;
        PluginCall call = pending; pending = null;
        try { if (listener != null) manager.stopServiceDiscovery(listener); } catch (RuntimeException ignored) {}
        if (lock != null && lock.isHeld()) lock.release();
        JSArray servers = new JSArray(); for (JSObject entry : found.values()) servers.put(entry);
        JSObject result = new JSObject(); result.put("servers", servers); call.resolve(result);
    }
    @Override protected void handleOnDestroy() { handler.post(() -> finish()); }
}
