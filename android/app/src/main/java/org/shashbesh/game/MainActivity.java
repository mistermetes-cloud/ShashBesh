package org.shashbesh.game;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LanDiscoveryPlugin.class);
        registerPlugin(LanHostPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
