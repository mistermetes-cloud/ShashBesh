package org.shashbesh.game;

import fi.iki.elonen.NanoHTTPD;
import fi.iki.elonen.NanoWSD;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

/** Native transport only. The existing TypeScript authority validates every intent. */
public class LanHttpServer extends NanoWSD {
    public interface Bridge {
        void event(String kind, String id, String peer, String method, String path, String body);
        InputStream asset(String path) throws IOException;
    }
    private final Bridge bridge;
    private final Map<String, WebSocket> peers = new ConcurrentHashMap<>();
    private final Map<String, Long> lastPong = new ConcurrentHashMap<>();
    private final ScheduledExecutorService heartbeat = Executors.newSingleThreadScheduledExecutor();
    private final Map<String, ArrayBlockingQueue<Response>> pending = new ConcurrentHashMap<>();
    public LanHttpServer(int port, Bridge bridge) {
        super("0.0.0.0", port); this.bridge = bridge;
        heartbeat.scheduleAtFixedRate(() -> {
            for (Map.Entry<String,WebSocket> entry:peers.entrySet()) {
                try {
                    Long pong = lastPong.get(entry.getKey());
                    if (pong == null || System.nanoTime()-pong > TimeUnit.SECONDS.toNanos(45)) {
                        entry.getValue().close(WebSocketFrame.CloseCode.GoingAway,"Heartbeat timeout",false);
                        entry.getValue().getHandshakeRequest().getInputStream().close();
                    } else entry.getValue().ping(new byte[0]);
                } catch(IOException ignored) {try {entry.getValue().getHandshakeRequest().getInputStream().close();} catch(IOException ignoredAgain){}}
            }
        },15,15,TimeUnit.SECONDS);
    }
    private Response json(Response.Status status, String body) {
        Response response = newFixedLengthResponse(status, "application/json", body);
        response.addHeader("Access-Control-Allow-Origin", "*");
        response.addHeader("Access-Control-Allow-Headers", "Content-Type");
        response.addHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        return response;
    }
    public void respond(String id, int status, String body) {
        ArrayBlockingQueue<Response> request = pending.get(id);
        if (request != null) request.offer(json(status == 200 ? Response.Status.OK : Response.Status.BAD_REQUEST, body));
    }
    public void send(String peer, String message) throws IOException {
        WebSocket socket = peers.get(peer);
        if (socket != null && socket.isOpen()) socket.send(message);
    }
    @Override protected Response serveHttp(IHTTPSession session) {
        String path = session.getUri();
        if (session.getMethod() == Method.OPTIONS) return json(Response.Status.OK, "{}");
        if (path.startsWith("/api/")) {
            String id = UUID.randomUUID().toString();
            ArrayBlockingQueue<Response> future = new ArrayBlockingQueue<>(1);
            try {
                String body = "";
                if (session.getMethod() == Method.POST) {
                    int length = Integer.parseInt((session.getHeaders().containsKey("content-length") ? session.getHeaders().get("content-length") : "0"));
                    if (length < 0 || length > 4096 || session.getHeaders().containsKey("transfer-encoding")) return json(Response.Status.BAD_REQUEST,"{\"error\":\"Request too large\"}");
                    Map<String,String> fields = new HashMap<>(); session.parseBody(fields);
                    body = (fields.containsKey("postData") ? fields.get("postData") : "");
                }
                pending.put(id, future);
                bridge.event("http", id, null, session.getMethod().name(), path, body);
                Response response = future.poll(15, TimeUnit.SECONDS);
                if (response == null) throw new IOException("Authority timeout");
                return response;
            } catch(Exception e) { return json(Response.Status.SERVICE_UNAVAILABLE,"{\"error\":\"Android host unavailable; keep the app open\"}"); }
            finally { pending.remove(id); }
        }
        if (path.contains("..") || path.contains("\\")) return json(Response.Status.FORBIDDEN,"{}");
        String file = path.equals("/") ? "index.html" : path.substring(1);
        try {
            InputStream asset;
            try { asset = bridge.asset(file); }
            catch(IOException e) { file = "index.html"; asset = bridge.asset(file); }
            String mime = file.endsWith(".js") ? "application/javascript" : file.endsWith(".css") ? "text/css" : file.endsWith(".html") ? "text/html" : "application/octet-stream";
            return newChunkedResponse(Response.Status.OK, mime, asset);
        } catch(IOException e) { return json(Response.Status.NOT_FOUND,"{}"); }
    }
    @Override protected WebSocket openWebSocket(IHTTPSession handshake) {
        final String peer = UUID.randomUUID().toString();
        return new WebSocket(handshake) {
            @Override protected void onOpen() {
                if (!handshake.getUri().equals("/ws")) { try {close(WebSocketFrame.CloseCode.PolicyViolation,"Wrong path",false);} catch(IOException ignored){} return; }
                peers.put(peer,this);
                lastPong.put(peer,System.nanoTime());
            }
            @Override protected void onMessage(WebSocketFrame frame) {
                String text = frame.getTextPayload();
                if (text == null || text.length() > 65536) {try {close(WebSocketFrame.CloseCode.MessageTooBig,"Limit",false);} catch(IOException ignored){} return;}
                bridge.event("message", "", peer, null, null, text);
            }
            @Override protected void onClose(WebSocketFrame.CloseCode code, String reason, boolean remote) {peers.remove(peer); lastPong.remove(peer); bridge.event("close","",peer,null,null,"");}
            @Override protected void onPong(WebSocketFrame frame) {lastPong.put(peer,System.nanoTime());}
            @Override protected void onException(IOException exception) {}
        };
    }
    @Override public void stop() {
        heartbeat.shutdownNow();
        for (WebSocket socket:peers.values()) try {socket.close(WebSocketFrame.CloseCode.GoingAway,"Host stopped",false);socket.getHandshakeRequest().getInputStream().close();} catch(IOException ignored){}
        peers.clear();
        lastPong.clear();
        for (ArrayBlockingQueue<Response> future:pending.values()) future.offer(json(Response.Status.SERVICE_UNAVAILABLE,"{}"));
        super.stop();
    }
}
