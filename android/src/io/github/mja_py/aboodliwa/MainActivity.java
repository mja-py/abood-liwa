package io.github.mja_py.aboodliwa;

import android.app.Activity;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Abood in Liwa as an Android app: one full-screen WebView showing the web game, whose files travel inside the APK.
 *
 * The game is served to the WebView from the APK's assets under an https address that never touches the network.
 * That gives the page a secure origin, which ES modules and saved progress (localStorage) need, and it is why the
 * app asks for no internet permission at all. No libraries: only what Android itself provides, so the APK stays small.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net"; // reserved by Google for pages served from an app's own assets
    private static final String HOME = "https://" + HOST + "/index.html";
    private WebView web;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); // a run is driven with one thumb held still: the screen must not dim
        if (Build.VERSION.SDK_INT >= 30) w.setDecorFitsSystemWindows(false); // the game draws edge to edge, under the hidden bars
        if (Build.VERSION.SDK_INT >= 28) { // and under the camera cut-out; the page keeps its buttons clear with safe-area insets
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            w.setAttributes(lp);
        }

        web = new WebView(this);
        web.setBackgroundColor(0xFF232A52);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);   // progress is saved in localStorage
        s.setTextZoom(100);             // the phone's font-size setting must not stretch the menus
        s.setSupportZoom(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (!HOST.equals(u.getHost())) return null; // anything else has nowhere to go: the app has no internet permission
                String path = u.getPath();
                if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
                Map<String, String> headers = new HashMap<>();
                headers.put("Cache-Control", "no-cache");
                try {
                    return new WebResourceResponse(mime(path), text(path) ? "utf-8" : null, 200, "OK", headers, getAssets().open("www" + path));
                } catch (IOException missing) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", headers, new ByteArrayInputStream(new byte[0]));
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !HOST.equals(request.getUrl().getHost()); // the game never leaves its own pages
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                // the page's own full-screen button is for browsers; here the app is already full screen
                view.evaluateJavascript("(function(){var b=document.getElementById('fsBtn');if(b)b.hidden=true;})()", null);
            }
        });
        setContentView(web);
        if (state == null) web.loadUrl(HOME); else web.restoreState(state);
    }

    private static boolean text(String p) {
        return p.endsWith(".html") || p.endsWith(".js") || p.endsWith(".css") || p.endsWith(".json") || p.endsWith(".webmanifest") || p.endsWith(".txt");
    }

    private static String mime(String p) {
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "text/javascript"; // module scripts are refused without a JavaScript type
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg")) return "image/jpeg";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".webmanifest")) return "application/manifest+json";
        return "text/plain";
    }

    /** Hide the status and navigation bars; a swipe from the edge brings them back for a moment. */
    private void immersive() {
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (focused) immersive();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onPause() {
        web.onPause(); // the page sees itself hidden and pauses the run
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    /**
     * Back steps out one layer at a time, the way the on-screen buttons do: close a sheet, pause a run, end a paused run,
     * leave the results card for the menu. Only from the menu does it leave the app.
     */
    @Override
    public void onBackPressed() {
        String js = "(function(){var g=function(i){return document.getElementById(i)},up=function(i){var e=g(i);return e&&!e.hidden},tap=function(i){g(i).click();return 'ok'};"
                + "try{if(up('langPick'))return 'exit';if(up('sheet'))return tap('sheetClose');if(up('menu'))return 'exit';if(up('over'))return tap('overMenuBtn');"
                + "if(up('pausePop'))return tap('pauseMenuBtn');if(up('pauseBtn'))return tap('pauseBtn');}catch(e){}return 'exit'})()";
        web.evaluateJavascript(js, result -> { if (result == null || result.contains("exit")) finish(); });
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}
