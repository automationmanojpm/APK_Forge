plugins {
    alias(libs.plugins.android.application)
}

fun parseAppVersionCode(raw: String?): Int {
    val s = raw?.trim().orEmpty()
    return s.toIntOrNull() ?: error(
        "Invalid app.versionCode \"$s\" in gradle.properties. " +
            "It must be a whole number (1, 2, 3…). " +
            "For labels like 1.1 use app.versionName instead."
    )
}

// Must match Java/Kotlin `package` and java/... folders. Change only after a package refactor.
val templateCodePackage = "com.proqa.testapp"

val appApplicationId = (project.findProperty("app.applicationId") as String?)!!.trim()
val appDisplayName = (project.findProperty("app.displayName") as String?)!!.trim()
val appVersionCode = parseAppVersionCode(project.findProperty("app.versionCode") as String?)
val appVersionName = (project.findProperty("app.versionName") as String?)!!.trim()

/** Safe base name for APK files (from app.displayName). */
fun sanitizeApkBaseName(raw: String): String =
    raw.trim().replace(Regex("[^A-Za-z0-9._-]"), "_").ifBlank { "app" }

val apkBaseName = sanitizeApkBaseName(appDisplayName)

/** CI / headless signing via env (see .github/workflows/build-from-dispatch.yml). */
val releaseKeystoreFile = System.getenv("RELEASE_KEYSTORE_FILE")?.trim().orEmpty()
val releaseStorePassword = System.getenv("RELEASE_STORE_PASSWORD")?.trim().orEmpty()
val releaseKeyAlias = System.getenv("RELEASE_KEY_ALIAS")?.trim().orEmpty()
val releaseKeyPassword = System.getenv("RELEASE_KEY_PASSWORD")?.trim().orEmpty()
val ciReleaseSigning = listOf(
    releaseKeystoreFile,
    releaseStorePassword,
    releaseKeyAlias,
    releaseKeyPassword,
).all { it.isNotBlank() }

android {
    namespace = templateCodePackage

    buildFeatures {
        buildConfig = true
        resValues = true
    }

    compileSdk {
        version = release(36) {
            minorApiLevel = 1
        }
    }

    defaultConfig {
        applicationId = appApplicationId
        minSdk = 23
        targetSdk = 36
        versionCode = appVersionCode
        versionName = appVersionName

        resValue("string", "app_name", appDisplayName)

        val buildTime = System.currentTimeMillis().toString()
        buildConfigField("String", "BUILD_TIME", "\"$buildTime\"")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        if (ciReleaseSigning) {
            create("ciRelease") {
                storeFile = file(releaseKeystoreFile)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            if (ciReleaseSigning) {
                signingConfig = signingConfigs.getByName("ciRelease")
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

@Suppress("UnstableApiUsage")
androidComponents {
    onVariants(selector().all()) { variant ->
        variant.outputs.forEach { output ->
            val fileName = "$apkBaseName-${variant.buildType}-v$appVersionName.apk"
            (output as com.android.build.api.variant.impl.VariantOutputImpl).outputFileName.set(fileName)
        }
    }
}

dependencies {
    implementation(libs.appcompat)
    implementation(libs.material)
    implementation(libs.activity)
    implementation(libs.constraintlayout)
    testImplementation(libs.junit)
    androidTestImplementation(libs.ext.junit)
    androidTestImplementation(libs.espresso.core)
}