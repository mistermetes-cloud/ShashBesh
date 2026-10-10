package org.shashbesh.game;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.InputStream;
import java.net.NetworkInterface;
import java.net.InetAddress;
import java.net.Inet4Address;
import java.util.Collections;

@CapacitorPlugin(name="LanHost")
public class LanHostPlugin extends Plugin {
    private LanHttpServer server;
    private NsdManager manager;
    private NsdManager.RegistrationListener registration;
    @PluginMethod public synchronized void start(PluginCall call) {
        try {
            // A reloaded WebView has a new TS session. Disconnect old peers so they reauthenticate.
            if (server != null) {server.stop();server=null;}
            if(manager != null && registration != null) try {manager.unregisterService(registration);} catch(RuntimeException ignored){}
            if (server == null) {
                server = new LanHttpServer(8787, new LanHttpServer.Bridge() {
                    public InputStream asset(String path) throws IOException {return getContext().getAssets().open("public/"+path);}
                    public void event(String kind,String id,String peer,String method,String path,String body) {
                        JSObject event = new JSObject();event.put("kind",kind);event.put("id",id);event.put("peer",peer);event.put("method",method);event.put("path",path);
                        event.put(kind.equals("message") ? "message" : "body",body);
                        getActivity().runOnUiThread(() -> notifyListeners("request",event));
                    }
                });
                server.start(0,false);
                manager = (NsdManager)getContext().getSystemService(Context.NSD_SERVICE);
                if (manager != null) {
                    NsdServiceInfo service = new NsdServiceInfo();service.setServiceName("ShashBesh Android");service.setServiceType("_shashbesh._tcp.");service.setPort(8787);
                    registration = new NsdManager.RegistrationListener() {
                        public void onServiceRegistered(NsdServiceInfo s) {}
                        public void onRegistrationFailed(NsdServiceInfo s,int code) {}
                        public void onServiceUnregistered(NsdServiceInfo s) {}
                        public void onUnregistrationFailed(NsdServiceInfo s,int code) {}
                    };
                    try {manager.registerService(service,NsdManager.PROTOCOL_DNS_SD,registration);} catch(RuntimeException ignored){}
                }
            }
            JSArray urls = new JSArray();
            for (NetworkInterface iface:Collections.list(NetworkInterface.getNetworkInterfaces()))
                for (InetAddress address:Collections.list(iface.getInetAddresses()))
                    if (address instanceof Inet4Address && !address.isLoopbackAddress()) urls.put("http://"+address.getHostAddress()+":8787");
            JSObject result = new JSObject();result.put("urls",urls);call.resolve(result);
        } catch(Exception error) {if(server != null) server.stop();server=null;call.reject("Cannot start LAN host",error);}
    }
    @PluginMethod public void respond(PluginCall call) {if(server != null) server.respond(call.getString("id"),call.getInt("status",400),call.getString("body","{}"));call.resolve();}
    @PluginMethod public void send(PluginCall call) {try {if(server != null) server.send(call.getString("peer"),call.getString("message"));call.resolve();} catch(IOException error) {call.reject("Socket disconnected",error);}}
    @Override protected void handleOnDestroy() {if(server != null) server.stop();if(manager != null && registration != null) try {manager.unregisterService(registration);} catch(RuntimeException ignored){} }
}
