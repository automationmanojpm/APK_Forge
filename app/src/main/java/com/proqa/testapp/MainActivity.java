package com.proqa.testapp;

import com.proqa.testapp.BuildConfig;

import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Choreographer;
import android.view.View;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.snackbar.Snackbar;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class MainActivity extends AppCompatActivity {

    private final BroadcastReceiver restrictionsChangedReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            MainActivity host = MainActivity.this;
            if (host.isDestroyed()) {
                return;
            }
            host.reloadRestrictionsAfterRestrictionsBroadcast();
        }
    };

    private final ActivityResultLauncher<String> saveBuildInfoDocument = registerForActivityResult(
            new ActivityResultContracts.CreateDocument("text/plain"),
            this::onSaveBuildInfoResult
    );

    private Bundle restrictions = Bundle.EMPTY;
    private String builtIst;
    private String displayName;
    private String buildInfoBlock;

    private TextView qaBuildDetails;
    private TextView qaBannerMessage;
    private TextView qaManagedConfigDetails;
    private MaterialButton copyButton;

    /** Re-read restrictions on the next frame — Play may commit the bundle slightly after the first read. */
    private final Runnable deferredFollowUpReload = new Runnable() {
        @Override
        public void run() {
            if (MainActivity.this.isDestroyed()) {
                return;
            }
            MainActivity.this.reloadRestrictionsAndBind(false);
        }
    };
    private MaterialButton shareButton;
    private MaterialButton printButton;
    private MaterialButton saveButton;
    private MaterialButton openUrlButton;
    private MaterialButton emailButton;
    private MaterialButton appInfoButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        TextView appTitle = findViewById(R.id.qaAppTitle);
        qaBuildDetails = findViewById(R.id.qaBuildDetails);
        qaBannerMessage = findViewById(R.id.qaBannerMessage);
        qaManagedConfigDetails = findViewById(R.id.qaManagedConfigDetails);
        copyButton = findViewById(R.id.qaCopyButton);
        shareButton = findViewById(R.id.qaShareButton);
        printButton = findViewById(R.id.qaPrintButton);
        saveButton = findViewById(R.id.qaSaveButton);
        openUrlButton = findViewById(R.id.qaOpenUrlButton);
        emailButton = findViewById(R.id.qaEmailButton);
        appInfoButton = findViewById(R.id.qaAppInfoButton);

        displayName = getString(R.string.app_name);
        appTitle.setText(displayName);

        long buildTimeMillis = Long.parseLong(BuildConfig.BUILD_TIME);
        SimpleDateFormat istFormat = new SimpleDateFormat("dd MMM yyyy, HH:mm:ss", Locale.US);
        istFormat.setTimeZone(TimeZone.getTimeZone("Asia/Kolkata"));
        builtIst = istFormat.format(new Date(buildTimeMillis)) + " (IST)";

        registerApplicationRestrictionsReceiver();
        reloadRestrictionsAndBind(false);

        copyButton.setOnClickListener(v -> copyBuildInfo());
        shareButton.setOnClickListener(v -> shareBuildInfo());
        printButton.setOnClickListener(v -> printBuildInfo());
        saveButton.setOnClickListener(v -> saveBuildInfoToFile());
        openUrlButton.setOnClickListener(v -> openTestUrl());
        emailButton.setOnClickListener(v -> emailBuildInfo());
        appInfoButton.setOnClickListener(v -> openAppSystemSettings());
    }

    @Override
    protected void onResume() {
        super.onResume();
        reloadRestrictionsAndBind(true);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && !isDestroyed()) {
            reloadRestrictionsAndBind(true);
        }
    }

    @Override
    protected void onDestroy() {
        try {
            getApplicationContext().unregisterReceiver(restrictionsChangedReceiver);
        } catch (IllegalArgumentException ignored) {
        }
        super.onDestroy();
    }

    private void registerApplicationRestrictionsReceiver() {
        IntentFilter filter = new IntentFilter(Intent.ACTION_APPLICATION_RESTRICTIONS_CHANGED);
        Context app = getApplicationContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            app.registerReceiver(restrictionsChangedReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            app.registerReceiver(restrictionsChangedReceiver, filter);
        }
    }

    private void reloadRestrictionsAfterRestrictionsBroadcast() {
        reloadRestrictionsAndBind(true);
        scheduleVsyncFollowUpReloads(2);
    }

    /**
     * @param scheduleFollowUpPost when true, queue one extra read on the next UI frame (skipped for
     *                              the follow-up itself to avoid loops).
     */
    private void reloadRestrictionsAndBind(boolean scheduleFollowUpPost) {
        restrictions = AppRestrictions.getBundle(this);
        bindRestrictionsUi();
        if (!scheduleFollowUpPost) {
            return;
        }
        View anchor = findViewById(R.id.main);
        if (anchor == null || isDestroyed()) {
            return;
        }
        anchor.removeCallbacks(deferredFollowUpReload);
        anchor.post(deferredFollowUpReload);
    }

    private void scheduleVsyncFollowUpReloads(int frames) {
        if (frames <= 0 || isDestroyed()) {
            return;
        }
        final Choreographer ch = Choreographer.getInstance();
        final int[] remaining = {frames};
        final Choreographer.FrameCallback cb = new Choreographer.FrameCallback() {
            @Override
            public void doFrame(long frameTimeNanos) {
                if (MainActivity.this.isDestroyed()) {
                    return;
                }
                MainActivity.this.reloadRestrictionsAndBind(false);
                remaining[0]--;
                if (remaining[0] > 0) {
                    ch.postFrameCallback(this);
                }
            }
        };
        ch.postFrameCallback(cb);
    }

    private void bindRestrictionsUi() {
        String banner = AppRestrictions.getString(restrictions, AppRestrictions.KEY_QA_BANNER_MESSAGE);
        if (banner.isEmpty()) {
            qaBannerMessage.setVisibility(TextView.GONE);
        } else {
            qaBannerMessage.setText(banner);
            qaBannerMessage.setVisibility(TextView.VISIBLE);
        }

        String managed = AppRestrictions.formatForDisplay(restrictions);
        if (restrictions.isEmpty()) {
            managed += "\n\n" + getString(R.string.qa_managed_config_empty_hint, BuildConfig.APPLICATION_ID);
        }
        qaManagedConfigDetails.setText(managed);
        qaBuildDetails.setText(buildDetailLines());
        buildInfoBlock = buildCopyBlock();

        copyButton.setEnabled(!AppRestrictions.getBool(restrictions, AppRestrictions.KEY_QA_DISABLE_COPY));
        shareButton.setEnabled(!AppRestrictions.getBool(restrictions, AppRestrictions.KEY_QA_DISABLE_SHARE));
        printButton.setEnabled(!AppRestrictions.getBool(restrictions, AppRestrictions.KEY_QA_DISABLE_PRINT));
        saveButton.setEnabled(!AppRestrictions.getBool(restrictions, AppRestrictions.KEY_QA_DISABLE_SAVE));
        openUrlButton.setEnabled(!AppRestrictions.getBool(restrictions, AppRestrictions.KEY_QA_DISABLE_BROWSER));
        emailButton.setEnabled(!AppRestrictions.getBool(restrictions, AppRestrictions.KEY_QA_DISABLE_EMAIL));
    }

    @NonNull
    private String buildDetailLines() {
        StringBuilder sb = new StringBuilder();
        sb.append("Display name: ").append(displayName).append('\n')
                .append("Version name: ").append(BuildConfig.VERSION_NAME).append('\n')
                .append("Version code: ").append(BuildConfig.VERSION_CODE).append('\n')
                .append("Application ID: ").append(BuildConfig.APPLICATION_ID).append('\n')
                .append("Debuggable: ").append(BuildConfig.DEBUG ? "yes" : "no").append('\n')
                .append("Built (IST): ").append(builtIst).append('\n')
                .append("Device: ").append(Build.MANUFACTURER).append(' ').append(Build.MODEL).append('\n')
                .append("OS: Android ").append(Build.VERSION.RELEASE)
                .append(" (API ").append(Build.VERSION.SDK_INT).append(')');

        sb.append(AppRestrictions.summarizeForBuildFooter(restrictions));
        return sb.toString();
    }

    @NonNull
    private String buildCopyBlock() {
        String details = buildDetailLines();
        return details + "\n\n"
                + "Managed configuration:\n"
                + AppRestrictions.formatForDisplay(restrictions);
    }

    private void copyBuildInfo() {
        if (AppRestrictions.getBool(restrictions, AppRestrictions.KEY_QA_DISABLE_COPY)) {
            showPolicyBlocked(AppRestrictions.KEY_QA_DISABLE_COPY);
            return;
        }
        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard != null) {
            clipboard.setPrimaryClip(ClipData.newPlainText(getString(R.string.qa_screen_title), buildInfoBlock));
        }
        Snackbar.make(findViewById(R.id.main), R.string.qa_copied, Snackbar.LENGTH_SHORT).show();
    }

    private void shareBuildInfo() {
        if (AppRestrictions.getBool(restrictions, AppRestrictions.KEY_QA_DISABLE_SHARE)) {
            showPolicyBlocked(AppRestrictions.KEY_QA_DISABLE_SHARE);
            return;
        }
        Intent send = new Intent(Intent.ACTION_SEND)
                .setType("text/plain")
                .putExtra(Intent.EXTRA_SUBJECT, getString(R.string.app_name) + " — build info")
                .putExtra(Intent.EXTRA_TEXT, buildInfoBlock);
        startActivityOrWarn(Intent.createChooser(send, getString(R.string.qa_share)));
    }

    private void printBuildInfo() {
        if (AppRestrictions.getBool(restrictions, AppRestrictions.KEY_QA_DISABLE_PRINT)) {
            showPolicyBlocked(AppRestrictions.KEY_QA_DISABLE_PRINT);
            return;
        }
        String job = getString(R.string.app_name) + " — " + getString(R.string.qa_action_print);
        QaPrintHelper.printPlainText(this, job, buildInfoBlock);
    }

    private void saveBuildInfoToFile() {
        if (AppRestrictions.getBool(restrictions, AppRestrictions.KEY_QA_DISABLE_SAVE)) {
            showPolicyBlocked(AppRestrictions.KEY_QA_DISABLE_SAVE);
            return;
        }
        saveBuildInfoDocument.launch("build-info.txt");
    }

    private void onSaveBuildInfoResult(@Nullable Uri uri) {
        if (uri == null) {
            return;
        }
        try (OutputStream os = getContentResolver().openOutputStream(uri)) {
            if (os == null) {
                Snackbar.make(findViewById(R.id.main), R.string.qa_save_failed, Snackbar.LENGTH_LONG).show();
                return;
            }
            os.write(buildInfoBlock.getBytes(StandardCharsets.UTF_8));
            Snackbar.make(findViewById(R.id.main), R.string.qa_saved, Snackbar.LENGTH_SHORT).show();
        } catch (IOException e) {
            Snackbar.make(findViewById(R.id.main), R.string.qa_save_failed, Snackbar.LENGTH_LONG).show();
        }
    }

    private void openTestUrl() {
        if (AppRestrictions.getBool(restrictions, AppRestrictions.KEY_QA_DISABLE_BROWSER)) {
            showPolicyBlocked(AppRestrictions.KEY_QA_DISABLE_BROWSER);
            return;
        }
        String url = AppRestrictions.getString(restrictions, AppRestrictions.KEY_QA_TEST_OPEN_URL);
        if (url.isEmpty()) {
            url = getString(R.string.qa_default_test_url);
        }
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        startActivityOrWarn(intent);
    }

    private void emailBuildInfo() {
        if (AppRestrictions.getBool(restrictions, AppRestrictions.KEY_QA_DISABLE_EMAIL)) {
            showPolicyBlocked(AppRestrictions.KEY_QA_DISABLE_EMAIL);
            return;
        }
        Uri mail = new Uri.Builder()
                .scheme("mailto")
                .appendQueryParameter("subject", getString(R.string.app_name) + " — build info")
                .appendQueryParameter("body", buildInfoBlock)
                .build();
        Intent intent = new Intent(Intent.ACTION_SENDTO, mail);
        startActivityOrWarn(intent);
    }

    private void openAppSystemSettings() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.fromParts("package", getPackageName(), null));
        startActivityOrWarn(intent);
    }

    private void startActivityOrWarn(@Nullable Intent intent) {
        if (intent == null) {
            return;
        }
        if (intent.resolveActivity(getPackageManager()) != null) {
            startActivity(intent);
        } else {
            Snackbar.make(findViewById(R.id.main), R.string.qa_no_handler, Snackbar.LENGTH_LONG).show();
        }
    }

    private void showPolicyBlocked(@NonNull String restrictionKey) {
        Snackbar.make(findViewById(R.id.main), getString(R.string.qa_policy_blocked, restrictionKey), Snackbar.LENGTH_LONG)
                .show();
    }
}
