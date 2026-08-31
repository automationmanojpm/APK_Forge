package com.proqa.testapp;

import android.content.Context;
import android.os.Build;
import android.os.UserManager;

import androidx.annotation.NonNull;

/**
 * Labels the current Android user profile (personal vs work) for QA storage checks.
 * Storage and SAF grants are always scoped to the profile this app is installed in.
 */
public final class ProfileHelper {

    private ProfileHelper() {
    }

    public static boolean isWorkProfile(@NonNull Context context) {
        UserManager um = (UserManager) context.getSystemService(Context.USER_SERVICE);
        if (um == null) {
            return false;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return um.isManagedProfile();
        }
        // Pre-R: managed/work profiles are non-system users on typical MDM setups.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return !um.isSystemUser();
        }
        return false;
    }

    @NonNull
    public static String profileDisplayName(@NonNull Context context) {
        return isWorkProfile(context)
                ? context.getString(R.string.qa_profile_work)
                : context.getString(R.string.qa_profile_personal);
    }

    @NonNull
    public static String profileLabelLine(@NonNull Context context) {
        return context.getString(R.string.qa_profile_label, profileDisplayName(context));
    }
}
