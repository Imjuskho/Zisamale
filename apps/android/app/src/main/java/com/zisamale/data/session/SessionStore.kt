package com.zisamale.data.session

import android.content.Context
import android.content.SharedPreferences
import com.zisamale.security.KeystoreCipher

/**
 * Session storage. The auth token is encrypted with an AndroidKeyStore
 * AES/GCM key before it touches disk; identity fields are non-secret and
 * stored as plaintext for cheap reads.
 */
class SessionStore(context: Context) {
    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    var token: String?
        get() = prefs.getString(KEY_TOKEN, null)?.let { blob ->
            try {
                String(KeystoreCipher.decrypt(ALIAS, blob))
            } catch (_: Exception) {
                null // keystore key lost — force re-login
            }
        }
        set(value) {
            prefs.edit().putString(
                KEY_TOKEN,
                value?.takeIf { it.isNotBlank() }?.let { KeystoreCipher.encrypt(ALIAS, it.toByteArray()) }
            ).apply()
        }

    var userId: String?
        get() = prefs.getString(KEY_USER_ID, null)
        set(value) = prefs.edit().putString(KEY_USER_ID, value).apply()

    var chwId: String?
        get() = prefs.getString(KEY_CHW_ID, null)
        set(value) = prefs.edit().putString(KEY_CHW_ID, value).apply()

    var displayName: String?
        get() = prefs.getString(KEY_NAME, null)
        set(value) = prefs.edit().putString(KEY_NAME, value).apply()

    var role: String?
        get() = prefs.getString(KEY_ROLE, null)
        set(value) = prefs.edit().putString(KEY_ROLE, value).apply()

    val isLoggedIn: Boolean
        get() = !token.isNullOrBlank() && !userId.isNullOrBlank()

    fun catchmentId(): String = chwId ?: userId ?: ""

    fun clear() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val PREFS = "zisamale_session"
        private const val KEY_TOKEN = "token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_CHW_ID = "chw_id"
        private const val KEY_NAME = "name"
        private const val KEY_ROLE = "role"
        private const val ALIAS = "zisamale_session_key"
    }
}
