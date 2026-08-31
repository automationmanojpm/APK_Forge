package com.proqa.testapp;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.telephony.TelephonyManager;
import android.telephony.UiccCardInfo;
import android.telephony.euicc.EuiccManager;
import android.text.TextUtils;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;

import java.util.List;

/**
 * Reads the device eUICC EID via {@link EuiccManager} / {@link TelephonyManager}.
 * <p>
 * On modern Android, {@link EuiccManager#getEid()} typically requires carrier privileges
 * or {@code READ_PRIVILEGED_PHONE_STATE} (system apps). {@code READ_PHONE_STATE} alone is
 * often not enough — callers should surface that clearly when the read fails.
 */
public final class DeviceEidHelper {

    public enum Status {
        UNSUPPORTED,
        EUICC_DISABLED,
        UNAVAILABLE,
        /** Platform denied the read (usually missing carrier / privileged access). */
        ACCESS_DENIED,
        /** EID came from managed configuration (EMM), not the radio stack. */
        OK_MANAGED_CONFIG,
        OK
    }

    public static final class Result {
        @NonNull
        public final Status status;
        @Nullable
        public final String eid;
        @Nullable
        public final String detail;

        private Result(@NonNull Status status, @Nullable String eid, @Nullable String detail) {
            this.status = status;
            this.eid = eid;
            this.detail = detail;
        }

        @NonNull
        static Result of(@NonNull Status status, @Nullable String eid) {
            return new Result(status, eid, null);
        }

        @NonNull
        static Result of(@NonNull Status status, @Nullable String eid, @Nullable String detail) {
            return new Result(status, eid, detail);
        }
    }

    private DeviceEidHelper() {
    }

    public static boolean phoneStatePermissionGranted(@NonNull Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return true;
        }
        return ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE)
                == PackageManager.PERMISSION_GRANTED;
    }

    /**
     * True when we should ask for {@link Manifest.permission#READ_PHONE_STATE} before reading.
     */
    public static boolean needsPhoneStatePermission(@NonNull Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            return false;
        }
        return !phoneStatePermissionGranted(context);
    }

    /**
     * Fetch EID from the device; if blocked/empty, fall back to managed config
     * {@link AppRestrictions#KEY_QA_DEVICE_EID}.
     */
    @NonNull
    public static Result fetch(@NonNull Context context, @Nullable Bundle managedRestrictions) {
        Result device = fetchFromDevice(context);
        if (device.status == Status.OK && !TextUtils.isEmpty(device.eid)) {
            return device;
        }
        if (managedRestrictions != null) {
            String fromEmm = AppRestrictions.getString(managedRestrictions, AppRestrictions.KEY_QA_DEVICE_EID)
                    .trim();
            if (!TextUtils.isEmpty(fromEmm)) {
                return Result.of(Status.OK_MANAGED_CONFIG, fromEmm, "qa_device_eid");
            }
        }
        return device;
    }

    @NonNull
    public static Result fetch(@NonNull Context context) {
        return fetch(context, null);
    }

    @NonNull
    private static Result fetchFromDevice(@NonNull Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            return Result.of(Status.UNSUPPORTED, null);
        }

        if (!context.getPackageManager().hasSystemFeature(PackageManager.FEATURE_TELEPHONY_EUICC)
                && !context.getPackageManager().hasSystemFeature(PackageManager.FEATURE_TELEPHONY)) {
            return Result.of(Status.UNSUPPORTED, null, "no telephony / eUICC feature");
        }

        boolean sawAccessDenied = false;
        String eid = null;

        try {
            eid = eidFromDefaultEuicc(context);
        } catch (SecurityException e) {
            sawAccessDenied = true;
        } catch (UnsupportedOperationException e) {
            return Result.of(Status.UNSUPPORTED, null, e.getMessage());
        }

        if (TextUtils.isEmpty(eid) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                eid = eidFromAllEuiccCards(context);
            } catch (SecurityException e) {
                sawAccessDenied = true;
            } catch (UnsupportedOperationException ignored) {
                // Fall through to telephony / status below.
            }
        }

        if (TextUtils.isEmpty(eid)) {
            try {
                eid = eidFromTelephonyCards(context);
            } catch (SecurityException e) {
                sawAccessDenied = true;
            }
        }

        if (!TextUtils.isEmpty(eid)) {
            return Result.of(Status.OK, eid);
        }

        EuiccManager euicc = (EuiccManager) context.getSystemService(Context.EUICC_SERVICE);
        if (euicc != null) {
            try {
                if (!euicc.isEnabled()) {
                    return Result.of(Status.EUICC_DISABLED, null);
                }
            } catch (UnsupportedOperationException e) {
                return Result.of(Status.UNSUPPORTED, null, e.getMessage());
            }
        }

        if (sawAccessDenied) {
            return Result.of(
                    Status.ACCESS_DENIED,
                    null,
                    "Android blocked EID without carrier privileges or privileged phone access"
            );
        }

        return Result.of(Status.UNAVAILABLE, null);
    }

    @Nullable
    private static String eidFromDefaultEuicc(@NonNull Context context) {
        EuiccManager euicc = (EuiccManager) context.getSystemService(Context.EUICC_SERVICE);
        if (euicc == null) {
            return null;
        }
        try {
            if (!euicc.isEnabled()) {
                return null;
            }
        } catch (UnsupportedOperationException e) {
            throw e;
        }
        return emptyToNull(euicc.getEid());
    }

    @Nullable
    private static String eidFromAllEuiccCards(@NonNull Context context) {
        if (!phoneStatePermissionGranted(context)) {
            return null;
        }
        TelephonyManager tm = context.getSystemService(TelephonyManager.class);
        EuiccManager base = (EuiccManager) context.getSystemService(Context.EUICC_SERVICE);
        if (tm == null || base == null) {
            return null;
        }
        List<UiccCardInfo> cards = tm.getUiccCardsInfo();
        if (cards == null || cards.isEmpty()) {
            return null;
        }
        for (UiccCardInfo card : cards) {
            if (card == null) {
                continue;
            }
            String fromCard = emptyToNull(card.getEid());
            if (fromCard != null) {
                return fromCard;
            }
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                continue;
            }
            if (!card.isEuicc()) {
                continue;
            }
            EuiccManager forCard = base.createForCardId(card.getCardId());
            if (forCard == null || !forCard.isEnabled()) {
                continue;
            }
            String eid = emptyToNull(forCard.getEid());
            if (eid != null) {
                return eid;
            }
        }
        return null;
    }

    @Nullable
    private static String eidFromTelephonyCards(@NonNull Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return null;
        }
        if (!phoneStatePermissionGranted(context)) {
            return null;
        }
        TelephonyManager tm = context.getSystemService(TelephonyManager.class);
        if (tm == null) {
            return null;
        }
        List<UiccCardInfo> cards = tm.getUiccCardsInfo();
        if (cards == null) {
            return null;
        }
        for (UiccCardInfo card : cards) {
            if (card == null) {
                continue;
            }
            String eid = emptyToNull(card.getEid());
            if (eid != null) {
                return eid;
            }
        }
        return null;
    }

    @Nullable
    private static String emptyToNull(@Nullable String value) {
        return TextUtils.isEmpty(value) ? null : value;
    }
}
