import org.shashbesh.game.LanHttpServer;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.Base64;

/** Runs the exact Android transport on a desktop JVM; authority remains in TS. */
public class LanTransportHarness {
    static String encoded(String text) {return Base64.getEncoder().encodeToString(text.getBytes(StandardCharsets.UTF_8));}
    static String decoded(String text) {return new String(Base64.getDecoder().decode(text),StandardCharsets.UTF_8);}
    public static void main(String[] args) throws Exception {
        LanHttpServer server = new LanHttpServer(0,new LanHttpServer.Bridge() {
            public InputStream asset(String path) throws IOException {return Files.newInputStream(Path.of("apps/web/dist",path));}
            public void event(String kind,String id,String peer,String method,String path,String body) {
                synchronized(System.out) {System.out.println(String.join("\t","EVENT",kind,id,peer==null?"":peer,method==null?"":method,path==null?"":path,encoded(body)));System.out.flush();}
            }
        });
        server.start(0,false);
        System.out.println("READY\t"+server.getListeningPort());System.out.flush();
        try(BufferedReader reader=new BufferedReader(new InputStreamReader(System.in,StandardCharsets.UTF_8))) {
            String line;
            while((line=reader.readLine())!=null) {
                String[] fields=line.split("\t",-1);
                if(fields[0].equals("RESPONSE")) server.respond(fields[1],Integer.parseInt(fields[2]),decoded(fields[3]));
                else if(fields[0].equals("SEND")) server.send(fields[1],decoded(fields[2]));
            }
        } finally {server.stop();}
    }
}
