package com.proqa.testapp;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.text.TextUtils;
import android.text.format.Formatter;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.documentfile.provider.DocumentFile;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.snackbar.Snackbar;

import java.text.DateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * In-app file explorer for the current Android profile (personal or work).
 * Browse a SAF folder tree or MediaStore Photos / Downloads lists.
 */
public class FileExplorerActivity extends AppCompatActivity {

    private static final String PREFS = "file_explorer";
    private static final String KEY_TREE_URI = "tree_uri";

    private enum Mode {
        HOME,
        TREE,
        PHOTOS,
        DOWNLOADS
    }

    private TextView profileView;
    private TextView pathView;
    private TextView emptyView;
    private MaterialButton upButton;
    private RecyclerView listView;

    private final List<Entry> entries = new ArrayList<>();
    private EntryAdapter adapter;

    private Mode mode = Mode.HOME;
    @Nullable
    private DocumentFile treeRoot;
    @Nullable
    private DocumentFile currentDir;
    private final List<DocumentFile> treeStack = new ArrayList<>();
    @Nullable
    private Mode pendingMediaMode;

    private final ActivityResultLauncher<Uri> openTree =
            registerForActivityResult(new ActivityResultContracts.OpenDocumentTree(), this::onTreePicked);

    private final ActivityResultLauncher<String[]> requestMediaPermission =
            registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), this::onMediaPermissionResult);

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_file_explorer);

        MaterialToolbar toolbar = findViewById(R.id.fileExplorerToolbar);
        toolbar.setNavigationOnClickListener(v -> getOnBackPressedDispatcher().onBackPressed());

        profileView = findViewById(R.id.fileExplorerProfile);
        pathView = findViewById(R.id.fileExplorerPath);
        emptyView = findViewById(R.id.fileExplorerEmpty);
        upButton = findViewById(R.id.fileExplorerUpButton);
        listView = findViewById(R.id.fileExplorerList);

        profileView.setText(ProfileHelper.profileLabelLine(this));

        adapter = new EntryAdapter(entries, this::onEntryClicked);
        listView.setLayoutManager(new LinearLayoutManager(this));
        listView.setAdapter(adapter);

        findViewById(R.id.fileExplorerChooseFolderButton).setOnClickListener(v -> openTree.launch(null));
        findViewById(R.id.fileExplorerPhotosButton).setOnClickListener(v -> ensureMediaThen(Mode.PHOTOS));
        findViewById(R.id.fileExplorerDownloadsButton).setOnClickListener(v -> ensureMediaThen(Mode.DOWNLOADS));
        upButton.setOnClickListener(v -> navigateUp());

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (mode == Mode.TREE && !treeStack.isEmpty()) {
                    navigateUp();
                } else if (mode != Mode.HOME) {
                    showHome();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });

        if (!restorePersistedTree()) {
            showHome();
        }
    }

    private void onMediaPermissionResult(@NonNull java.util.Map<String, Boolean> result) {
        boolean anyGranted = false;
        for (Boolean granted : result.values()) {
            if (Boolean.TRUE.equals(granted)) {
                anyGranted = true;
                break;
            }
        }
        Mode target = pendingMediaMode;
        pendingMediaMode = null;
        if (anyGranted) {
            if (target == Mode.PHOTOS) {
                showPhotos();
            } else if (target == Mode.DOWNLOADS) {
                showDownloads();
            }
        } else {
            Snackbar.make(findViewById(R.id.fileExplorerRoot), R.string.qa_files_permission_denied,
                    Snackbar.LENGTH_LONG).show();
        }
    }

    private boolean restorePersistedTree() {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String saved = prefs.getString(KEY_TREE_URI, null);
        if (TextUtils.isEmpty(saved)) {
            return false;
        }
        Uri uri = Uri.parse(saved);
        if (!hasPersistedRead(uri)) {
            prefs.edit().remove(KEY_TREE_URI).apply();
            return false;
        }
        DocumentFile root = DocumentFile.fromTreeUri(this, uri);
        if (root == null || !root.exists() || !root.isDirectory()) {
            prefs.edit().remove(KEY_TREE_URI).apply();
            return false;
        }
        openTreeRoot(root, uri, false);
        return true;
    }

    private boolean hasPersistedRead(@NonNull Uri uri) {
        for (android.content.UriPermission p : getContentResolver().getPersistedUriPermissions()) {
            if (p.getUri().equals(uri) && p.isReadPermission()) {
                return true;
            }
        }
        return false;
    }

    private void onTreePicked(@Nullable Uri uri) {
        if (uri == null) {
            return;
        }
        final int flags = Intent.FLAG_GRANT_READ_URI_PERMISSION;
        try {
            getContentResolver().takePersistableUriPermission(uri, flags);
        } catch (SecurityException e) {
            Snackbar.make(findViewById(R.id.fileExplorerRoot), R.string.qa_files_tree_failed, Snackbar.LENGTH_LONG)
                    .show();
            return;
        }
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(KEY_TREE_URI, uri.toString()).apply();
        DocumentFile root = DocumentFile.fromTreeUri(this, uri);
        if (root == null || !root.exists()) {
            Snackbar.make(findViewById(R.id.fileExplorerRoot), R.string.qa_files_tree_failed, Snackbar.LENGTH_LONG)
                    .show();
            return;
        }
        openTreeRoot(root, uri, true);
    }

    private void openTreeRoot(@NonNull DocumentFile root, @NonNull Uri uri, boolean toastOk) {
        treeRoot = root;
        currentDir = root;
        treeStack.clear();
        mode = Mode.TREE;
        pathView.setText(displayPath(uri, root));
        loadTreeChildren();
        if (toastOk) {
            Snackbar.make(findViewById(R.id.fileExplorerRoot), R.string.qa_files_tree_opened, Snackbar.LENGTH_SHORT)
                    .show();
        }
    }

    private void showHome() {
        mode = Mode.HOME;
        treeStack.clear();
        currentDir = null;
        pathView.setText(R.string.qa_files_path_home);
        upButton.setEnabled(false);
        entries.clear();
        adapter.notifyDataSetChanged();
        emptyView.setVisibility(View.VISIBLE);
        emptyView.setText(R.string.qa_files_empty_hint);
        listView.setVisibility(View.GONE);
    }

    private void ensureMediaThen(@NonNull Mode target) {
        String[] needed = mediaPermissionsFor(target);
        List<String> missing = new ArrayList<>();
        for (String p : needed) {
            if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                missing.add(p);
            }
        }
        if (missing.isEmpty()) {
            if (target == Mode.PHOTOS) {
                showPhotos();
            } else {
                showDownloads();
            }
            return;
        }
        pendingMediaMode = target;
        requestMediaPermission.launch(missing.toArray(new String[0]));
    }

    @NonNull
    private String[] mediaPermissionsFor(@NonNull Mode target) {
        if (Build.VERSION.SDK_INT >= 33) {
            if (target == Mode.PHOTOS) {
                return new String[]{android.Manifest.permission.READ_MEDIA_IMAGES};
            }
            // Downloads: prefer visual media if any; also request images for mixed lists.
            return new String[]{
                    android.Manifest.permission.READ_MEDIA_IMAGES,
                    android.Manifest.permission.READ_MEDIA_VIDEO
            };
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return new String[]{android.Manifest.permission.READ_EXTERNAL_STORAGE};
        }
        return new String[0];
    }

    private void showPhotos() {
        mode = Mode.PHOTOS;
        treeStack.clear();
        currentDir = null;
        upButton.setEnabled(false);
        pathView.setText(R.string.qa_files_path_photos);
        entries.clear();
        Uri collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
        String[] projection = {
                MediaStore.Images.Media._ID,
                MediaStore.Images.Media.DISPLAY_NAME,
                MediaStore.Images.Media.SIZE,
                MediaStore.Images.Media.DATE_MODIFIED,
                MediaStore.Images.Media.MIME_TYPE
        };
        String sort = MediaStore.Images.Media.DATE_MODIFIED + " DESC";
        try (Cursor c = getContentResolver().query(collection, projection, null, null, sort)) {
            if (c != null) {
                int idCol = c.getColumnIndexOrThrow(MediaStore.Images.Media._ID);
                int nameCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME);
                int sizeCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE);
                int dateCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_MODIFIED);
                int mimeCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.MIME_TYPE);
                while (c.moveToNext()) {
                    long id = c.getLong(idCol);
                    Uri contentUri = ContentUris.withAppendedId(collection, id);
                    String name = c.getString(nameCol);
                    long size = c.isNull(sizeCol) ? -1 : c.getLong(sizeCol);
                    long modifiedSec = c.isNull(dateCol) ? 0 : c.getLong(dateCol);
                    String mime = c.getString(mimeCol);
                    entries.add(Entry.media(contentUri, name != null ? name : contentUri.toString(),
                            size, modifiedSec * 1000L, mime, false));
                }
            }
        } catch (SecurityException e) {
            Snackbar.make(findViewById(R.id.fileExplorerRoot), R.string.qa_files_permission_denied,
                    Snackbar.LENGTH_LONG).show();
        }
        publishList(R.string.qa_files_empty_list);
    }

    private void showDownloads() {
        mode = Mode.DOWNLOADS;
        treeStack.clear();
        currentDir = null;
        upButton.setEnabled(false);
        pathView.setText(R.string.qa_files_path_downloads);
        entries.clear();
        Uri collection = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                ? MediaStore.Downloads.EXTERNAL_CONTENT_URI
                : MediaStore.Files.getContentUri("external");
        String[] projection = {
                MediaStore.MediaColumns._ID,
                MediaStore.MediaColumns.DISPLAY_NAME,
                MediaStore.MediaColumns.SIZE,
                MediaStore.MediaColumns.DATE_MODIFIED,
                MediaStore.MediaColumns.MIME_TYPE
        };
        String selection = null;
        String[] selectionArgs = null;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            selection = MediaStore.MediaColumns.DATA + " LIKE ?";
            selectionArgs = new String[]{"%/Download/%"};
        }
        String sort = MediaStore.MediaColumns.DATE_MODIFIED + " DESC";
        try (Cursor c = getContentResolver().query(collection, projection, selection, selectionArgs, sort)) {
            if (c != null) {
                int idCol = c.getColumnIndexOrThrow(MediaStore.MediaColumns._ID);
                int nameCol = c.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME);
                int sizeCol = c.getColumnIndexOrThrow(MediaStore.MediaColumns.SIZE);
                int dateCol = c.getColumnIndexOrThrow(MediaStore.MediaColumns.DATE_MODIFIED);
                int mimeCol = c.getColumnIndexOrThrow(MediaStore.MediaColumns.MIME_TYPE);
                while (c.moveToNext()) {
                    long id = c.getLong(idCol);
                    Uri contentUri = ContentUris.withAppendedId(collection, id);
                    String name = c.getString(nameCol);
                    long size = c.isNull(sizeCol) ? -1 : c.getLong(sizeCol);
                    long modifiedSec = c.isNull(dateCol) ? 0 : c.getLong(dateCol);
                    String mime = c.getString(mimeCol);
                    entries.add(Entry.media(contentUri, name != null ? name : contentUri.toString(),
                            size, modifiedSec * 1000L, mime, false));
                }
            }
        } catch (SecurityException e) {
            Snackbar.make(findViewById(R.id.fileExplorerRoot), R.string.qa_files_permission_denied,
                    Snackbar.LENGTH_LONG).show();
        }
        publishList(R.string.qa_files_empty_list);
    }

    private void loadTreeChildren() {
        entries.clear();
        if (currentDir == null) {
            publishList(R.string.qa_files_empty_list);
            return;
        }
        DocumentFile[] children = currentDir.listFiles();
        if (children != null) {
            List<DocumentFile> sorted = new ArrayList<>(Arrays.asList(children));
            Collections.sort(sorted, new Comparator<DocumentFile>() {
                @Override
                public int compare(DocumentFile a, DocumentFile b) {
                    if (a.isDirectory() != b.isDirectory()) {
                        return a.isDirectory() ? -1 : 1;
                    }
                    String an = a.getName();
                    String bn = b.getName();
                    if (an == null) {
                        an = "";
                    }
                    if (bn == null) {
                        bn = "";
                    }
                    return an.compareToIgnoreCase(bn);
                }
            });
            for (DocumentFile child : sorted) {
                String name = child.getName();
                if (name == null) {
                    name = child.getUri().toString();
                }
                entries.add(Entry.document(child, name));
            }
        }
        upButton.setEnabled(!treeStack.isEmpty());
        if (currentDir.getUri() != null) {
            pathView.setText(displayPath(currentDir.getUri(), currentDir));
        }
        publishList(R.string.qa_files_empty_list);
    }

    private void publishList(int emptyRes) {
        adapter.notifyDataSetChanged();
        boolean empty = entries.isEmpty();
        emptyView.setVisibility(empty ? View.VISIBLE : View.GONE);
        if (empty) {
            emptyView.setText(emptyRes);
        }
        listView.setVisibility(empty && mode == Mode.HOME ? View.GONE : View.VISIBLE);
        if (mode == Mode.HOME) {
            listView.setVisibility(View.GONE);
        }
    }

    private void onEntryClicked(@NonNull Entry entry) {
        if (entry.isDirectory && entry.document != null) {
            treeStack.add(currentDir);
            currentDir = entry.document;
            loadTreeChildren();
            return;
        }
        showFileActions(entry);
    }

    private void navigateUp() {
        if (mode != Mode.TREE || treeStack.isEmpty()) {
            showHome();
            return;
        }
        currentDir = treeStack.remove(treeStack.size() - 1);
        loadTreeChildren();
    }

    private void showFileActions(@NonNull Entry entry) {
        String meta = formatMeta(entry);
        CharSequence[] actions = new CharSequence[]{
                getString(R.string.qa_files_open),
                getString(R.string.qa_files_share),
                getString(R.string.qa_files_copy_uri)
        };
        new AlertDialog.Builder(this)
                .setTitle(entry.name)
                .setMessage(meta)
                .setItems(actions, (dialog, which) -> {
                    if (which == 0) {
                        openUri(entry.uri, entry.mimeType);
                    } else if (which == 1) {
                        shareUri(entry.uri, entry.mimeType, entry.name);
                    } else {
                        copyUri(entry.uri);
                    }
                })
                .setNegativeButton(android.R.string.cancel, null)
                .show();
    }

    private void openUri(@NonNull Uri uri, @Nullable String mime) {
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, mime != null ? mime : "*/*");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            startActivity(Intent.createChooser(intent, getString(R.string.qa_files_open)));
        } catch (Exception e) {
            Toast.makeText(this, R.string.qa_no_handler, Toast.LENGTH_LONG).show();
        }
    }

    private void shareUri(@NonNull Uri uri, @Nullable String mime, @NonNull String name) {
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType(mime != null ? mime : "*/*");
        send.putExtra(Intent.EXTRA_STREAM, uri);
        send.putExtra(Intent.EXTRA_SUBJECT, name);
        send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivity(Intent.createChooser(send, getString(R.string.qa_files_share)));
    }

    private void copyUri(@NonNull Uri uri) {
        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard != null) {
            clipboard.setPrimaryClip(ClipData.newPlainText("URI", uri.toString()));
        }
        Snackbar.make(findViewById(R.id.fileExplorerRoot), R.string.qa_files_uri_copied, Snackbar.LENGTH_SHORT)
                .show();
    }

    @NonNull
    private String displayPath(@NonNull Uri uri, @Nullable DocumentFile file) {
        String name = file != null ? file.getName() : null;
        if (!TextUtils.isEmpty(name)) {
            return name + "  ·  " + uri;
        }
        return uri.toString();
    }

    @NonNull
    private String formatMeta(@NonNull Entry entry) {
        StringBuilder sb = new StringBuilder();
        if (entry.isDirectory) {
            sb.append(getString(R.string.qa_files_type_folder));
        } else {
            sb.append(getString(R.string.qa_files_type_file));
            if (entry.sizeBytes >= 0) {
                sb.append(" · ").append(Formatter.formatShortFileSize(this, entry.sizeBytes));
            }
            if (!TextUtils.isEmpty(entry.mimeType)) {
                sb.append(" · ").append(entry.mimeType);
            }
        }
        if (entry.lastModifiedMs > 0) {
            String when = DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT, Locale.getDefault())
                    .format(new Date(entry.lastModifiedMs));
            sb.append('\n').append(when);
        }
        sb.append('\n').append(entry.uri);
        return sb.toString();
    }

    private static final class Entry {
        final Uri uri;
        final String name;
        final boolean isDirectory;
        final long sizeBytes;
        final long lastModifiedMs;
        @Nullable
        final String mimeType;
        @Nullable
        final DocumentFile document;

        private Entry(@NonNull Uri uri, @NonNull String name, boolean isDirectory, long sizeBytes,
                      long lastModifiedMs, @Nullable String mimeType, @Nullable DocumentFile document) {
            this.uri = uri;
            this.name = name;
            this.isDirectory = isDirectory;
            this.sizeBytes = sizeBytes;
            this.lastModifiedMs = lastModifiedMs;
            this.mimeType = mimeType;
            this.document = document;
        }

        static Entry document(@NonNull DocumentFile file, @NonNull String name) {
            return new Entry(file.getUri(), name, file.isDirectory(), file.length(), file.lastModified(),
                    file.getType(), file);
        }

        static Entry media(@NonNull Uri uri, @NonNull String name, long size, long modifiedMs,
                           @Nullable String mime, boolean directory) {
            return new Entry(uri, name, directory, size, modifiedMs, mime, null);
        }
    }

    private static final class EntryAdapter extends RecyclerView.Adapter<EntryAdapter.Holder> {
        interface Listener {
            void onClick(@NonNull Entry entry);
        }

        private final List<Entry> data;
        private final Listener listener;

        EntryAdapter(@NonNull List<Entry> data, @NonNull Listener listener) {
            this.data = data;
            this.listener = listener;
        }

        @NonNull
        @Override
        public Holder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_file_entry, parent, false);
            return new Holder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull Holder holder, int position) {
            Entry e = data.get(position);
            holder.icon.setText(e.isDirectory ? "📁" : "📄");
            holder.name.setText(e.name);
            Context ctx = holder.itemView.getContext();
            StringBuilder meta = new StringBuilder();
            if (e.isDirectory) {
                meta.append(ctx.getString(R.string.qa_files_type_folder));
            } else if (e.sizeBytes >= 0) {
                meta.append(Formatter.formatShortFileSize(ctx, e.sizeBytes));
            }
            if (e.lastModifiedMs > 0) {
                if (meta.length() > 0) {
                    meta.append(" · ");
                }
                meta.append(DateFormat.getDateInstance(DateFormat.MEDIUM, Locale.getDefault())
                        .format(new Date(e.lastModifiedMs)));
            }
            holder.meta.setText(meta);
            holder.itemView.setOnClickListener(v -> listener.onClick(e));
        }

        @Override
        public int getItemCount() {
            return data.size();
        }

        static final class Holder extends RecyclerView.ViewHolder {
            final TextView icon;
            final TextView name;
            final TextView meta;

            Holder(@NonNull View itemView) {
                super(itemView);
                icon = itemView.findViewById(R.id.fileEntryIcon);
                name = itemView.findViewById(R.id.fileEntryName);
                meta = itemView.findViewById(R.id.fileEntryMeta);
            }
        }
    }
}
