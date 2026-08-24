package com.zisamale.security

import android.content.Context
import android.content.SharedPreferences

/**
 * Holds the SQLCipher database passphrase. The raw 32-byte passphrase is
 * generated once and stored only as an AndroidKeyStore-encrypted blob.
 */
object DbKeyManager {

    private const val PREFS = "zisamale_db_keys"
    private const val KEY_PASSPHRASE = "db_passphrase"
    private const val ALIAS = "zisamale_db_key"

    fun getOrCreatePassphrase(context: Context): ByteArray {
        val prefs: SharedPreferences =
            context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val stored = prefs.getString(KEY_PASSPHRASE, null)
        if (stored != null) {
            return try {
                KeystoreCipher.decrypt(ALIAS, stored)
            } catch (_: Exception) {
                // Keystore key lost (e.g. device wipe of keystore) — rotate.
                // Encrypted DB becomes unreadable; recreate it (offline cache
                // is re-syncable by design).
                rotate(context, prefs)
            }
        }
        return rotate(context, prefs)
    }

    private fun rotate(context: Context, prefs: SharedPreferences): ByteArray {
        val fresh = KeystoreCipher.newRandomKeyMaterial(32)
        prefs.edit()
            .putString(KEY_PASSPHRASE, KeystoreCipher.encrypt(ALIAS, fresh))
            .apply()
        return fresh
    }
}
