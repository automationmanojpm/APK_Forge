package com.proqa.testapp;

import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.text.TextUtils;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

/**
 * Prints plain text via an off-screen {@link WebView} (system print / BYO print policies).
 */
public final class QaPrintHelper {

    private QaPrintHelper() {
    }

    public static void printPlainText(
            @NonNull AppCompatActivity activity,
            @NonNull String jobName,
            @NonNull String plainText
    ) {
        String html = "<html><head><meta charset=\"utf-8\"><style>"
                + "body{font-family:monospace;white-space:pre-wrap;padding:12px;font-size:12px;}"
                + "</style></head><body>"
                + TextUtils.htmlEncode(plainText)
                + "</body></html>";

        WebView webView = new WebView(activity);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                PrintManager printManager = (PrintManager) activity.getSystemService(AppCompatActivity.PRINT_SERVICE);
                if (printManager == null) {
                    return;
                }
                PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(jobName);
                printManager.print(
                        jobName,
                        adapter,
                        new PrintAttributes.Builder().build()
                );
            }
        });
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }
}
