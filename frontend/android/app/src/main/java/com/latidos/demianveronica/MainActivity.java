package com.latidos.demianveronica;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeTorchPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
