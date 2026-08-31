package com.proqa.testapp;

import android.Manifest;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.View;
import android.widget.ImageView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.google.common.util.concurrent.ListenableFuture;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * In-app CameraX preview + still capture for QA (does not launch the system camera app).
 */
public class InAppCameraActivity extends AppCompatActivity {

    private PreviewView previewView;
    private ImageView capturedImage;
    private MaterialButton captureButton;
    private MaterialButton retakeButton;
    private MaterialButton shareButton;

    @Nullable
    private ImageCapture imageCapture;
    @Nullable
    private File lastCaptureFile;
    private ExecutorService cameraExecutor;
    private boolean showingCapture;

    private final ActivityResultLauncher<String> requestCameraPermission =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
                if (granted) {
                    startCamera();
                } else {
                    Toast.makeText(this, R.string.qa_camera_permission_denied, Toast.LENGTH_LONG).show();
                    finish();
                }
            });

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_in_app_camera);

        MaterialToolbar toolbar = findViewById(R.id.cameraToolbar);
        toolbar.setNavigationOnClickListener(v -> finish());
        toolbar.setNavigationIconTint(0xFFFFFFFF);

        previewView = findViewById(R.id.cameraPreview);
        capturedImage = findViewById(R.id.cameraCapturedImage);
        captureButton = findViewById(R.id.cameraCaptureButton);
        retakeButton = findViewById(R.id.cameraRetakeButton);
        shareButton = findViewById(R.id.cameraShareButton);

        cameraExecutor = Executors.newSingleThreadExecutor();

        captureButton.setOnClickListener(v -> takePhoto());
        retakeButton.setOnClickListener(v -> showPreviewMode());
        shareButton.setOnClickListener(v -> shareLastCapture());

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED) {
            startCamera();
        } else {
            requestCameraPermission.launch(Manifest.permission.CAMERA);
        }
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> future = ProcessCameraProvider.getInstance(this);
        future.addListener(() -> {
            try {
                ProcessCameraProvider provider = future.get();
                try {
                    bindUseCases(provider, CameraSelector.DEFAULT_BACK_CAMERA);
                } catch (IllegalArgumentException noBack) {
                    bindUseCases(provider, CameraSelector.DEFAULT_FRONT_CAMERA);
                }
            } catch (ExecutionException | InterruptedException | IllegalArgumentException e) {
                Toast.makeText(this, R.string.qa_camera_start_failed, Toast.LENGTH_LONG).show();
                finish();
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void bindUseCases(
            @NonNull ProcessCameraProvider provider, @NonNull CameraSelector selector) {
        Preview preview = new Preview.Builder().build();
        preview.setSurfaceProvider(previewView.getSurfaceProvider());
        imageCapture = new ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                .build();
        provider.unbindAll();
        provider.bindToLifecycle(this, selector, preview, imageCapture);
    }

    private void takePhoto() {
        ImageCapture capture = imageCapture;
        if (capture == null || showingCapture) {
            return;
        }
        File dir = new File(getCacheDir(), "camera");
        if (!dir.exists() && !dir.mkdirs()) {
            Toast.makeText(this, R.string.qa_camera_save_failed, Toast.LENGTH_LONG).show();
            return;
        }
        String name = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        File out = new File(dir, "QA_" + name + ".jpg");
        ImageCapture.OutputFileOptions options =
                new ImageCapture.OutputFileOptions.Builder(out).build();
        captureButton.setEnabled(false);
        capture.takePicture(
                options,
                cameraExecutor,
                new ImageCapture.OnImageSavedCallback() {
                    @Override
                    public void onImageSaved(@NonNull ImageCapture.OutputFileResults outputFileResults) {
                        runOnUiThread(() -> {
                            captureButton.setEnabled(true);
                            lastCaptureFile = out;
                            showCaptureMode(out);
                            persistCapture(out);
                        });
                    }

                    @Override
                    public void onError(@NonNull ImageCaptureException exception) {
                        runOnUiThread(() -> {
                            captureButton.setEnabled(true);
                            Toast.makeText(
                                            InAppCameraActivity.this,
                                            R.string.qa_camera_capture_failed,
                                            Toast.LENGTH_LONG)
                                    .show();
                        });
                    }
                });
    }

    private void showCaptureMode(@NonNull File file) {
        showingCapture = true;
        capturedImage.setImageURI(Uri.fromFile(file));
        capturedImage.setVisibility(View.VISIBLE);
        previewView.setVisibility(View.INVISIBLE);
        captureButton.setVisibility(View.GONE);
        retakeButton.setVisibility(View.VISIBLE);
        shareButton.setVisibility(View.VISIBLE);
    }

    private void showPreviewMode() {
        showingCapture = false;
        capturedImage.setVisibility(View.GONE);
        capturedImage.setImageDrawable(null);
        previewView.setVisibility(View.VISIBLE);
        captureButton.setVisibility(View.VISIBLE);
        retakeButton.setVisibility(View.GONE);
        shareButton.setVisibility(View.GONE);
    }

    private void persistCapture(@NonNull File file) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, file.getName());
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            values.put(
                    MediaStore.Images.Media.RELATIVE_PATH,
                    Environment.DIRECTORY_PICTURES + "/QA");
            values.put(MediaStore.Images.Media.IS_PENDING, 1);
            Uri uri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (uri == null) {
                Toast.makeText(this, R.string.qa_camera_save_failed, Toast.LENGTH_LONG).show();
                return;
            }
            try (OutputStream os = getContentResolver().openOutputStream(uri);
                    FileInputStream in = new FileInputStream(file)) {
                if (os == null) {
                    return;
                }
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) >= 0) {
                    os.write(buf, 0, n);
                }
                values.clear();
                values.put(MediaStore.Images.Media.IS_PENDING, 0);
                getContentResolver().update(uri, values, null, null);
                Toast.makeText(this, R.string.qa_camera_saved, Toast.LENGTH_SHORT).show();
            } catch (IOException e) {
                Toast.makeText(this, R.string.qa_camera_save_failed, Toast.LENGTH_LONG).show();
            }
            return;
        }
        File pictures = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        if (pictures == null) {
            Toast.makeText(this, R.string.qa_camera_saved_cache, Toast.LENGTH_SHORT).show();
            return;
        }
        if (!pictures.exists() && !pictures.mkdirs()) {
            Toast.makeText(this, R.string.qa_camera_saved_cache, Toast.LENGTH_SHORT).show();
            return;
        }
        File dest = new File(pictures, file.getName());
        try (FileInputStream in = new FileInputStream(file);
                OutputStream os = new java.io.FileOutputStream(dest)) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) >= 0) {
                os.write(buf, 0, n);
            }
            Toast.makeText(this, R.string.qa_camera_saved, Toast.LENGTH_SHORT).show();
        } catch (IOException e) {
            Toast.makeText(this, R.string.qa_camera_saved_cache, Toast.LENGTH_SHORT).show();
        }
    }

    private void shareLastCapture() {
        File file = lastCaptureFile;
        if (file == null || !file.exists()) {
            return;
        }
        Uri uri = FileProvider.getUriForFile(
                this, getPackageName() + ".fileprovider", file);
        Intent send = new Intent(Intent.ACTION_SEND)
                .setType("image/jpeg")
                .putExtra(Intent.EXTRA_STREAM, uri)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivity(Intent.createChooser(send, getString(R.string.qa_camera_share)));
    }

    @Override
    protected void onDestroy() {
        if (cameraExecutor != null) {
            cameraExecutor.shutdown();
        }
        super.onDestroy();
    }
}
