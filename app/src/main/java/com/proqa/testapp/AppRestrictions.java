package com.proqa.testapp;

import android.content.Context;
import android.content.RestrictionsManager;
import android.os.Bundle;
import android.text.TextUtils;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;

/**
 * Managed application restrictions ({@link RestrictionsManager}) for EMM / policy testing.
 */
public final class AppRestrictions {

    public static final String KEY_QA_BANNER_MESSAGE = "qa_banner_message";
    public static final String KEY_QA_TEST_OPEN_URL = "qa_test_open_url";
    public static final String KEY_QA_CONFIG_NOTE = "qa_config_note";
    public static final String KEY_QA_TIMEOUT_SECONDS = "qa_timeout_seconds";
    public static final String KEY_QA_ENVIRONMENT = "qa_environment";
    public static final String KEY_QA_FEATURE_SET = "qa_feature_set";

    public static final String KEY_QA_DISABLE_PRINT = "qa_disable_print";
    public static final String KEY_QA_DISABLE_SAVE = "qa_disable_save";
    public static final String KEY_QA_DISABLE_BROWSER = "qa_disable_browser";
    public static final String KEY_QA_DISABLE_EMAIL = "qa_disable_email";
    public static final String KEY_QA_DISABLE_SHARE = "qa_disable_share";
    public static final String KEY_QA_DISABLE_COPY = "qa_disable_copy";

    public static final String FEATURE_VERBOSE_BUILD = "verbose_build";

    /** Must match {@code restriction_qa_feature_set_values} in arrays.xml. */
    private static final Set<String> QA_FEATURE_SET_ALLOWED = new HashSet<>(Arrays.asList(
            "diag_overlay",
            "verbose_build",
            "extra_logging"
    ));

    /** Must match {@code restriction_qa_environment_values} in arrays.xml. */
    private static final Set<String> QA_ENVIRONMENT_ALLOWED = new HashSet<>(Arrays.asList(
            "prod",
            "staging",
            "dev"
    ));

    private AppRestrictions() {
    }

    /**
     * Reads a {@code bool} restriction. Some EMMs send {@code "true"} / {@code "1"} / {@code "yes"}
     * as strings, or numeric flags — this normalizes those; missing key is {@code false}.
     * Any other string value is treated as {@code false} (not thrown).
     */
    public static boolean getBool(@NonNull Bundle restrictions, @NonNull String key) {
        if (!restrictions.containsKey(key)) {
            return false;
        }
        Object raw = restrictions.get(key);
        if (raw instanceof Boolean) {
            return (Boolean) raw;
        }
        if (raw instanceof String) {
            return parseTruthyString((String) raw);
        }
        if (raw instanceof Number) {
            return ((Number) raw).intValue() != 0;
        }
        return restrictions.getBoolean(key, false);
    }

    @NonNull
    public static Bundle getBundle(@NonNull Context context) {
        RestrictionsManager rm = (RestrictionsManager) context.getSystemService(Context.RESTRICTIONS_SERVICE);
        Bundle b = rm != null ? rm.getApplicationRestrictions() : null;
        return b != null ? new Bundle(b) : Bundle.EMPTY;
    }

    private static boolean parseTruthyString(@Nullable String s) {
        if (s == null) {
            return false;
        }
        String t = s.trim().toLowerCase(Locale.ROOT);
        if (t.isEmpty()) {
            return false;
        }
        if ("true".equals(t) || "1".equals(t) || "yes".equals(t) || "on".equals(t)) {
            return true;
        }
        if ("false".equals(t) || "0".equals(t) || "no".equals(t) || "off".equals(t)) {
            return false;
        }
        return false;
    }

    /**
     * String restriction, with fallback when the console stored a non-{@link String} type
     * (e.g. {@link CharSequence}) so {@link Bundle#getString} returned null.
     */
    @NonNull
    public static String getString(@NonNull Bundle restrictions, @NonNull String key) {
        String v = restrictions.getString(key);
        if (v != null) {
            return v.trim();
        }
        if (!restrictions.containsKey(key)) {
            return "";
        }
        Object raw = restrictions.get(key);
        if (raw == null) {
            return "";
        }
        if (raw instanceof CharSequence) {
            return raw.toString().trim();
        }
        return String.valueOf(raw).trim();
    }

    /**
     * Validated {@code choice} value for {@link #KEY_QA_ENVIRONMENT} (lowercase token in schema).
     * Unknown or blank values are treated as unset ({@code ""}) for app logic.
     */
    @NonNull
    public static String getEnvironment(@NonNull Bundle restrictions) {
        if (!restrictions.containsKey(KEY_QA_ENVIRONMENT)) {
            return "";
        }
        String token = rawScalarToString(restrictions.get(KEY_QA_ENVIRONMENT)).trim().toLowerCase(Locale.ROOT);
        if (token.isEmpty()) {
            return "";
        }
        return QA_ENVIRONMENT_ALLOWED.contains(token) ? token : "";
    }

    @NonNull
    private static String rawScalarToString(@Nullable Object raw) {
        if (raw == null) {
            return "";
        }
        if (raw instanceof String) {
            return (String) raw;
        }
        if (raw instanceof CharSequence) {
            return raw.toString();
        }
        if (raw instanceof Number || raw instanceof Boolean) {
            return String.valueOf(raw);
        }
        return String.valueOf(raw);
    }

    /**
     * Reads an {@code integer} managed restriction. Many EMMs deliver the value as a {@link String}
     * even when the schema type is integer — this parses {@link Integer}, {@link Long}, other
     * numbers, and numeric strings; otherwise returns {@code defaultValue}.
     */
    public static int getInt(@NonNull Bundle restrictions, @NonNull String key, int defaultValue) {
        if (!restrictions.containsKey(key)) {
            return defaultValue;
        }
        Integer parsed = parseIntegerObject(restrictions.get(key));
        return parsed != null ? parsed : defaultValue;
    }

    @Nullable
    private static Integer parseIntegerObject(@Nullable Object raw) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof Integer) {
            return (Integer) raw;
        }
        if (raw instanceof Long) {
            long v = (Long) raw;
            if (v < Integer.MIN_VALUE || v > Integer.MAX_VALUE) {
                return null;
            }
            return (int) v;
        }
        if (raw instanceof Short) {
            return ((Short) raw).intValue();
        }
        if (raw instanceof Byte) {
            return ((Byte) raw).intValue();
        }
        if (raw instanceof Double) {
            double v = (Double) raw;
            if (Double.isNaN(v) || Double.isInfinite(v)) {
                return null;
            }
            return (int) v;
        }
        if (raw instanceof Float) {
            float v = (Float) raw;
            if (Float.isNaN(v) || Float.isInfinite(v)) {
                return null;
            }
            return (int) v;
        }
        if (raw instanceof String) {
            String s = ((String) raw).trim();
            if (s.isEmpty()) {
                return null;
            }
            try {
                return Integer.parseInt(s);
            } catch (NumberFormatException ignored) {
                try {
                    return (int) Double.parseDouble(s);
                } catch (NumberFormatException ignored2) {
                    return null;
                }
            }
        }
        return null;
    }

    @Nullable
    private static String[] tryGetStringArray(@NonNull Bundle bundle, @NonNull String key) {
        try {
            return bundle.getStringArray(key);
        } catch (ClassCastException | IllegalStateException ignored) {
            return null;
        }
    }

    @Nullable
    private static ArrayList<String> tryGetStringArrayList(@NonNull Bundle bundle, @NonNull String key) {
        try {
            Object raw = bundle.get(key);
            if (!(raw instanceof ArrayList<?>)) {
                return null;
            }
            return bundle.getStringArrayList(key);
        } catch (ClassCastException | IllegalStateException ignored) {
            return null;
        }
    }

    /**
     * Selected values for {@code multi-select} restrictions.
     * <p>
     * Reads {@link Bundle#get(String)} before {@link Bundle#getStringArray} /
     * {@link Bundle#getStringArrayList}: some EMMs store the real selection only on the primary
     * value (e.g. a single {@code String} token) while typed array getters still expose the full
     * schema value list, which made the UI show every option as selected.
     */
    @NonNull
    public static String[] getMultiSelectValues(@NonNull Bundle restrictions, @NonNull String key) {
        if (!restrictions.containsKey(key)) {
            return new String[0];
        }

        Object raw = restrictions.get(key);
        if (raw instanceof String) {
            String s = ((String) raw).trim();
            if (!s.isEmpty()) {
                return normalizeMultiSelectTokens(s.split("\\s*,\\s*"), key);
            }
        }
        if (raw instanceof String[]) {
            String[] arr = (String[]) raw;
            return normalizeMultiSelectTokens(arr, key);
        }
        if (raw instanceof CharSequence[]) {
            CharSequence[] cs = (CharSequence[]) raw;
            String[] asStrings = new String[cs.length];
            for (int i = 0; i < cs.length; i++) {
                asStrings[i] = cs[i] != null ? cs[i].toString() : "";
            }
            return normalizeMultiSelectTokens(asStrings, key);
        }
        if (raw instanceof List<?>) {
            List<?> list = (List<?>) raw;
            String[] asStrings = new String[list.size()];
            for (int i = 0; i < list.size(); i++) {
                Object item = list.get(i);
                asStrings[i] = item != null ? item.toString() : "";
            }
            return normalizeMultiSelectTokens(asStrings, key);
        }
        if (raw instanceof Object[]) {
            Object[] arr = (Object[]) raw;
            String[] asStrings = new String[arr.length];
            for (int i = 0; i < arr.length; i++) {
                asStrings[i] = arr[i] != null ? String.valueOf(arr[i]) : "";
            }
            return normalizeMultiSelectTokens(asStrings, key);
        }

        String[] fromArray = tryGetStringArray(restrictions, key);
        if (fromArray != null && fromArray.length > 0) {
            return normalizeMultiSelectTokens(fromArray, key);
        }

        ArrayList<String> fromList = tryGetStringArrayList(restrictions, key);
        if (fromList != null && !fromList.isEmpty()) {
            return normalizeMultiSelectTokens(fromList.toArray(new String[0]), key);
        }

        return new String[0];
    }

    /**
     * Trim, dedupe, and for {@link #KEY_QA_FEATURE_SET} keep only tokens defined in the schema
     * (drops accidental duplicates / wrong types some consoles merge in).
     */
    @NonNull
    private static String[] normalizeMultiSelectTokens(@NonNull String[] raw, @NonNull String key) {
        LinkedHashSet<String> ordered = new LinkedHashSet<>();
        for (String s : raw) {
            if (s == null) {
                continue;
            }
            String t = s.trim();
            if (t.isEmpty()) {
                continue;
            }
            if (KEY_QA_FEATURE_SET.equals(key)) {
                if (QA_FEATURE_SET_ALLOWED.contains(t)) {
                    ordered.add(t);
                }
            } else {
                ordered.add(t);
            }
        }
        return ordered.toArray(new String[0]);
    }

    public static boolean multiSelectContains(@NonNull Bundle restrictions, @NonNull String key, @NonNull String value) {
        String[] values = getMultiSelectValues(restrictions, key);
        for (String v : values) {
            if (value.equals(v)) {
                return true;
            }
        }
        return false;
    }

    @NonNull
    public static String formatForDisplay(@NonNull Bundle restrictions) {
        if (restrictions.isEmpty()) {
            return "(No managed configuration set)";
        }
        TreeSet<String> sortedKeys = new TreeSet<>(restrictions.keySet());
        StringBuilder sb = new StringBuilder();
        for (String key : sortedKeys) {
            sb.append(key).append(": ");
            if (KEY_QA_FEATURE_SET.equals(key)) {
                String[] sel = getMultiSelectValues(restrictions, key);
                sb.append(sel.length == 0 ? "(none)" : TextUtils.join(", ", sel));
            } else if (KEY_QA_TIMEOUT_SECONDS.equals(key)) {
                Object raw = restrictions.get(key);
                Integer n = parseIntegerObject(raw);
                sb.append(n != null ? Integer.toString(n) : String.valueOf(raw));
            } else if (KEY_QA_ENVIRONMENT.equals(key)) {
                String raw = rawScalarToString(restrictions.get(key)).trim();
                String valid = getEnvironment(restrictions);
                if (raw.isEmpty()) {
                    sb.append("(empty)");
                } else if (!valid.isEmpty()) {
                    sb.append(valid);
                } else {
                    sb.append(raw).append(" (unknown)");
                }
            } else {
                sb.append(formatValue(restrictions.get(key)));
            }
            sb.append('\n');
        }
        return sb.toString().trim();
    }

    @NonNull
    private static String formatValue(@Nullable Object value) {
        if (value == null) {
            return "(null)";
        }
        if (value instanceof String[]) {
            return TextUtils.join(", ", (String[]) value);
        }
        if (value instanceof ArrayList<?>) {
            ArrayList<?> list = (ArrayList<?>) value;
            StringBuilder j = new StringBuilder();
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) {
                    j.append(", ");
                }
                j.append(list.get(i));
            }
            return j.toString();
        }
        if (value instanceof Boolean || value instanceof Integer || value instanceof Long) {
            return String.valueOf(value);
        }
        return String.valueOf(value);
    }

    @NonNull
    public static String summarizeForBuildFooter(@NonNull Bundle restrictions) {
        if (restrictions.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        if (restrictions.containsKey(KEY_QA_ENVIRONMENT)) {
            String rawEnv = rawScalarToString(restrictions.get(KEY_QA_ENVIRONMENT)).trim();
            String env = getEnvironment(restrictions);
            if (!env.isEmpty()) {
                sb.append("\nConfig environment: ").append(env);
            } else if (!rawEnv.isEmpty()) {
                sb.append("\nConfig environment: ").append(rawEnv).append(" (unknown)");
            } else {
                sb.append("\nConfig environment: (empty)");
            }
        }
        if (restrictions.containsKey(KEY_QA_TIMEOUT_SECONDS)) {
            Object raw = restrictions.get(KEY_QA_TIMEOUT_SECONDS);
            Integer n = parseIntegerObject(raw);
            if (n != null) {
                sb.append("\nConfig timeout (s): ").append(n);
            } else {
                sb.append("\nConfig timeout (s): ").append(String.valueOf(raw)).append(" (not a number)");
            }
        }
        String note = getString(restrictions, KEY_QA_CONFIG_NOTE);
        if (!note.isEmpty()) {
            sb.append("\nConfig note: ").append(note);
        }
        String[] features = getMultiSelectValues(restrictions, KEY_QA_FEATURE_SET);
        if (features.length > 0) {
            sb.append("\nConfig feature set: ").append(TextUtils.join(", ", features));
        }
        return sb.toString();
    }
}
