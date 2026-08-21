package com.zisamale.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        HouseholdEntity::class,
        PregnancyEntity::class,
        ChildEntity::class,
        VisitEntity::class,
        ReferralEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class ZisamaleDatabase : RoomDatabase() {
    abstract fun householdDao(): HouseholdDao
    abstract fun pregnancyDao(): PregnancyDao
    abstract fun childDao(): ChildDao
    abstract fun visitDao(): VisitDao
    abstract fun referralDao(): ReferralDao

    companion object {
        fun create(context: Context): ZisamaleDatabase {
            return Room.databaseBuilder(
                context.applicationContext,
                ZisamaleDatabase::class.java,
                "zisamale.db"
            ).build()
        }
    }
}
