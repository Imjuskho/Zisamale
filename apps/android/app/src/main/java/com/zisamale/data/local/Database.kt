package com.zisamale.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.zisamale.security.DbKeyManager
import net.zetetic.database.sqlcipher.SupportOpenHelperFactory
import java.io.File

@Database(
    entities = [
        HouseholdEntity::class,
        PregnancyEntity::class,
        ChildEntity::class,
        VisitEntity::class,
        ReferralEntity::class,
        PhotoEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class ZisamaleDatabase : RoomDatabase() {
    abstract fun householdDao(): HouseholdDao
    abstract fun pregnancyDao(): PregnancyDao
    abstract fun childDao(): ChildDao
    abstract fun visitDao(): VisitDao
    abstract fun referralDao(): ReferralDao
    abstract fun photoDao(): PhotoDao

    companion object {
        private const val DB_NAME = "zisamale.db"

        fun create(context: Context): ZisamaleDatabase {
            System.loadLibrary("sqlcipher")
            removeLegacyPlaintextDb(context)
            val factory = SupportOpenHelperFactory(DbKeyManager.getOrCreatePassphrase(context))
            return Room.databaseBuilder(
                context.applicationContext,
                ZisamaleDatabase::class.java,
                DB_NAME
            )
                .openHelperFactory(factory)
                .addMigrations(MIGRATION_1_2)
                .build()
        }

        private val MIGRATION_1_2 = object : androidx.room.migration.Migration(1, 2) {
            override fun migrate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS photo_queue (
                        photo_id TEXT NOT NULL PRIMARY KEY,
                        visit_id TEXT NOT NULL,
                        local_path TEXT NOT NULL,
                        remote_file_id TEXT,
                        bytes INTEGER NOT NULL,
                        sync_status TEXT NOT NULL,
                        created_at INTEGER NOT NULL
                    )
                    """.trimIndent()
                )
            }
        }

        /**
         * The skeleton previously shipped an unencrypted Room database. Before
         * any pilot devices exist we drop the legacy plaintext files rather
         * than migrate them — the offline cache is re-syncable by design.
         */
        private fun removeLegacyPlaintextDb(context: Context) {
            val dir = context.getDatabasePath(DB_NAME).parentFile ?: return
            listOf(DB_NAME, "$DB_NAME-wal", "$DB_NAME-shm").forEach { name ->
                File(dir, name).takeIf { it.exists() }?.delete()
            }
        }
    }
}
